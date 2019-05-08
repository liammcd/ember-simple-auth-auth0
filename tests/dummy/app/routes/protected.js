import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

export default Route.extend(AuthenticatedRouteMixin, {
  authenticationRoute: 'login',
  model() {
    return this.store.findAll('post').catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
  }
});
