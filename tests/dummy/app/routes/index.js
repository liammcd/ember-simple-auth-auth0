import Route from '@ember/routing/route';
import UnauthenticatedRouteMixin from 'ember-simple-auth/mixins/unauthenticated-route-mixin';

export default class IndexRoute extends Route.extend(UnauthenticatedRouteMixin) {
  routeIfAlreadyAuthenticated = 'protected';
}
