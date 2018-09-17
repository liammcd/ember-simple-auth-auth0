import { readOnly, bool } from '@ember/object/computed';
import { getOwner } from '@ember/application';
import { getProperties, get, getWithDefault, computed } from '@ember/object';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import Service, { inject as service } from '@ember/service';
import { merge as emberMerge, assign as emberAssign } from '@ember/polyfills';
import RSVP from 'rsvp';
import Auth0 from 'auth0-js';
import { Auth0Lock, Auth0LockPasswordless } from 'auth0-lock';
import createSessionDataObject from '../utils/create-session-data-object';
import { Auth0Error } from '../utils/errors'

const assign = Object.assign || emberAssign || emberMerge;

export default Service.extend({
  session: service(),

  inTesting: computed(function() {
    let config = getOwner(this).resolveRegistration('config:environment');
    return config.environment === 'test';
  }),

  /**
   * The env config found in the environment config.
   * ENV['ember-simple-auth'].auth0
   *
   * @type {Object}
   */
  config: computed({
    get() {
      const emberSimpleAuthConfig = get(this, '_environmentConfig')['ember-simple-auth'];
      assert('ember-simple-auth config must be defined', emberSimpleAuthConfig);
      assert('ember-simple-auth.auth0 config must be defined', emberSimpleAuthConfig.auth0);

      return emberSimpleAuthConfig.auth0;
    }
  }),

  /**
   * The Auth0 App ClientID found in your Auth0 dashboard
   * @type {String}
   */
  clientID: readOnly('config.clientID'),

  /**
   * The Auth0 App Domain found in your Auth0 dashboard
   * @type {String}
   */
  domain: readOnly('config.domain'),

  /**
   * The URL to return to when logging out
   * @type {String}
   */
  logoutReturnToURL: readOnly('config.logoutReturnToURL'),

  /**
   * Enable user impersonation. This is opt-in due to security risks.
   * @type {bool}
   */
  enableImpersonation: bool('config.enableImpersonation'),

  /**
   * Number of seconds between auto-renewing token via silent authentication.
   * @type {number}
   */
  silentAuthRenewSeconds: readOnly('config.silentAuth.renewSeconds'),

  /**
   * Automatically perform silent authentication on session restore.
   * @type {bool}
   */
  silentAuthOnSessionRestore: bool('config.silentAuth.onSessionRestore'),

  /**
   * Automatically perform silent authentication on session expiration.
   * @type {bool}
   */
  silentAuthOnSessionExpire: bool('config.silentAuth.onSessionExpire'),

  /**
   * Default options to use when performing silent authentication.
   * This is a function rather than a computed property since the
   * default redirectUri needs to be regenerated every time.
   * @return {Object}
   */
  getSilentAuthOptions() {
    const defaultOptions = {
      responseType: 'token',
      scope: 'openid',
      redirectUri: window.location.origin,
      timeout: 5000
    };
    const configOptions = getWithDefault(this, 'config.silentAuth.options', {});
    const redirectPath = configOptions.redirectPath;

    // Support redirectPath which becomes redirectUri with the origin location prepended.
    if (redirectPath) {
      assert('ember-simple-auth-auth0 redirectPath must start with /', redirectPath.startsWith('/'));
      configOptions.redirectUri = window.location.origin + redirectPath;
    }

    // [XA] convoluted assign logic, just in case the Ember.Merge fallback is used.
    const options = {};
    assign(options, defaultOptions);
    assign(options, configOptions);
    return options;
  },

  /**
   * Perform Silent Authentication with Auth0's checkSession() method.
   * Returns the authenticated data if successful, or rejects if not.
   *
   * This method does NOT actually create an ember-simple-auth session;
   * use the authenticator rather than calling this directly.
   *
   * @method silentAuth
   */
  silentAuth(options) {
    if(!options) {
      options = this.getSilentAuthOptions();
    }
    return new RSVP.Promise((resolve, reject) => {
      const auth0 = this.getAuth0Instance();
      auth0.checkSession(options, (err, data) => {
        if(!err) {
          // special check: running this with Ember Inspector active
          // results in an ember version object getting returned for
          // some oddball reason. Reject and warn the user (dev?).
          if(data && get(data, 'type') === 'emberVersion') {
            reject(new Auth0Error('Silent Authentication is not supported when Ember Inspector is enabled. Please disable the extension to re-enable support.'));
          } else {
            resolve(data);
          }
        } else {
          reject(new Auth0Error(err));
        }
      });
    });
  },

  showLock(options, clientID = null, domain = null, passwordless = false) {
    return new RSVP.Promise((resolve, reject) => {
      const lock = this.getAuth0LockInstance(options, clientID, domain, passwordless);
      this._setupLock(lock, resolve, reject);
      lock.show();
    });
  },

  showPasswordlessLock(options, clientID = null, domain = null) {
    return this.showLock(options, clientID, domain, true);
  },

  _setupLock(lock, resolve, reject) {
    lock.on('authenticated', (authenticatedData) => {
      if (isEmpty(authenticatedData)) {
        return reject(new Auth0Error('The authenticated data did not come back from the request'));
      }

      lock.getUserInfo(authenticatedData.accessToken, (error, profile) => {
        if (error) {
          return reject(new Auth0Error(error));
        }

        resolve(createSessionDataObject(profile, authenticatedData));
      });
    });
  },

  getAuth0LockInstance(options, clientID = null, domain = null, passwordless = false) {
    clientID = clientID || get(this, 'clientID');
    domain = domain || get(this, 'domain');
    const Auth0LockConstructor = get(this, passwordless ? '_auth0LockPasswordless' : '_auth0Lock');

    return new Auth0LockConstructor(clientID, domain, options);
  },

  getAuth0Instance(clientID = null, domain = null) {
    clientID = clientID || get(this, 'clientID');
    domain = domain || get(this, 'domain');

    const Auth0Constructor = get(this, '_auth0.WebAuth');

    return new Auth0Constructor({
      domain,
      clientID
    });
  },

  getAuth0LockPasswordlessInstance(options, clientID = null, domain = null) {
    return this.getAuth0LockInstance(options, clientID, domain, true);
  },

  navigateToLogoutURL(logoutUrl) {
    let {
      domain,
      logoutReturnToURL,
      clientID
    } = getProperties(this, 'domain', 'logoutReturnToURL', 'clientID');

    logoutReturnToURL = logoutUrl || logoutReturnToURL;

    if (!this.get('inTesting')) {
      window.location.replace(`https://${domain}/v2/logout?returnTo=${logoutReturnToURL}&client_id=${clientID}`);
    }
  },

  logout(logoutUrl) {
    get(this, 'session').invalidate().then(() => {
      this.navigateToLogoutURL(logoutUrl);
    });
  },

  _auth0: computed(function() {
    return Auth0;
  }),

  _auth0Lock: computed(function() {
    return Auth0Lock;
  }),

  _auth0LockPasswordless: computed(function() {
    return Auth0LockPasswordless;
  }),

  _environmentConfig: computed({
    get() {
      return getOwner(this).resolveRegistration('config:environment');
    }
  }),
});
