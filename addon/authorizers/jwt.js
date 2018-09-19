import { isPresent } from '@ember/utils';
import { debug } from '@ember/debug';
import { deprecate } from '@ember/application/deprecations';
import BaseAuthorizer from 'ember-simple-auth/authorizers/base';

export default BaseAuthorizer.extend({
  authorize(sessionData, block) {
    deprecate(`Ember Simple Auth Auth0: Authorizers are deprecated in Ember Simple Auth. Consider using the 'authorize' method of the auth0 service instead.`,
      false,
      {
        id: 'ember-simple-auth-auth0.jwtAuthorizer',
        until: '5.0.0',
        url: 'https://github.com/simplabs/ember-simple-auth#deprecation-of-authorizers',
      }
    );

    let userToken = sessionData['idToken'];

    if (isPresent(userToken)) {
      block('Authorization', `Bearer ${userToken}`);
    } else {
      debug('Could not find the authorization token in the session data for the jwt authorizer.');
    }
  }
});
