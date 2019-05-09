import RSVP from 'rsvp';
import { get } from '@ember/object';
import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';
import BaseAuthenticator from 'ember-simple-auth/authenticators/base';
import { Auth0Error } from '../utils/errors'
import createSessionDataObject from '../utils/create-session-data-object';
import getSessionExpiration from '../utils/get-session-expiration';
import now from '../utils/now';

export default BaseAuthenticator.extend({
  auth0: service(),
  restore(data) {
    const expiresAt = getSessionExpiration(data || {});
    if(expiresAt > now()) {
      return RSVP.resolve(data);
    } else if(get(this, 'auth0.silentAuthOnSessionRestore')) {
      return this._performSilentAuth()
    } else {
      return RSVP.reject();
    }
  },

  // resolve the data returned by a parseHash/silentAuth result.
  _resolveAuthResult(authResult, resolve, reject) {
    if (isEmpty(authResult)) {
      reject();
    }
    const auth0 = get(this, 'auth0')._getAuth0Instance();
    const getUserInfo = auth0.client.userInfo.bind(auth0.client);

    getUserInfo(authResult.accessToken, (err, profile) => {
      if (err) {
        return reject(new Auth0Error(err));
      }

      resolve(createSessionDataObject(profile, authResult));
    });
  },

  // performs silent authentication & handles the result in a promise.
  _performSilentAuth(options) {
    return new RSVP.Promise((resolve, reject) => {
      try {
        // perform silent auth via auth0's checkSession function (called in the service);
        // if successful, use the same logic as the url-hash authenticator since the
        // result of checkSession is the same as parseHash.
        get(this, 'auth0').silentAuth(options).then(authenticatedData => {
          this._resolveAuthResult(authenticatedData, resolve, reject);
        }, error => {
          // for any error types other than login_required, log it to the console.
          // otherwise, there are a few cases (auto-renewal, basically) where the
          // error details will get swallowed completely. Better to give feedback.
          if(console && error && error.name && error.name !== 'login_required') {
            console.warn(`Silent authentication failed: ${error.message}`); // eslint-disable-line no-console
          }
          reject(error);
        });
      } catch (e) {
        // Explictly catch, log, and rethrow errors because promises hide them.
        // This lets deeper Ember.assert calls actually log errors in development.
        console.log(e); // eslint-disable-line no-console
        throw e;
      }
    });
  }
});
