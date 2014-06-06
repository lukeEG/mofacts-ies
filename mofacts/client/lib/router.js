Router.configure({
//  autoRender: false,
    layoutTemplate: 'DefaultLayout'
});

Router.map(function() {

    this.route('signin', {
        path: '/signin',
        template: 'signInTemplate'
    }); 
    
    this.route('signup', {
        path: '/signup',
        template: 'signUpTemplate'
    });
    
    this.route('home', {
        path: '/',
        template: 'signInTemplate'
    });

    this.route('profile', {
        path: '/profile',
        template: 'profileTemplate'
    })

    this.route('card', {
        path: '/card',
        template: 'cardTemplate'
    })

    this.route('instructions', {
        path: '/instructions',
        template: 'instructionsTemplate'
    })

    this.route('stats', {
        path: '/stats',
        template: 'statsPageTemplate'
    })

});
