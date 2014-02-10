var fs = Npm.require('xml2js');

if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to mofacts_app.";
  };

  Template.hello.events({
    'click input' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
