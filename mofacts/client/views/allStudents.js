////////////////////////////////////////////////////////////////////////////
// Template storage and helpers

//INPUT: user, which is an object containing an _id which corresponds to a doc
//       in UserMetrics, and the name of the relevant Tdf (in Mongo-recognizable
//       format)
//OUTPUT: a ratio which is the user's average score across all items for the
//        client's current system.
function computeUserScore(user, tdfname) {
    var indivUserQuery = {'_id': user._id};
    // We use findOne because there should only ever be one user with any given id.
    var indivUser = UserMetrics.findOne(indivUserQuery);
    var askCount = 0;
    var correctCount = 0;
    _.chain(indivUser).prop(tdfname).each(function(item) {
        askCount += _.chain(item).prop('questionCount').intval().value();
        correctCount += _.chain(item).prop('correctAnswerCount').intval().value();
    });
    return correctCount / askCount;  // Note the possible of DBZ which would return NaN
}

Template.allStudents.helpers({
    username: function () {
        if (!haveMeteorUser()) {
            routeToSignin();
        }
        else {
            return Meteor.user().username;
        }
    },
    students: function() {
        var buttons = [];

        var userQuery = {};
        var tdfDBName = buildTdfDBName(getCurrentTdfName());
        userQuery[tdfDBName] = {'$exists': true};
        var currTdfUsers = UserMetrics.find(userQuery);

        _.chain(currTdfUsers).each(currTdfUsers, function(student) {
            student.username = Meteor.users.findOne({_id: student._id}, {username: true}).username;
            student.score = computeUserScore(student, tdfDBName);
            student.buttonColor = determineButtonColor(student.score);

            buttons.push(student);
        });

        return buttons;
    }
});


////////////////////////////////////////////////////////////////////////////
// Template Events

Template.allStudents.events({
    'click .logoutLink' : function (event) {
        event.preventDefault();
        Meteor.logout(function (error) {
            if (typeof error !== "undefined") {
                //something happened during logout
                console.log("User:" + Meteor.user() +" ERROR:" + error);
            }
            else {
                routeToSignin();
            }
        });
    },

    'click .homeLink' : function (event) {
        event.preventDefault();
        Router.go("/profile");
    },

    'click .allItemsLink' : function (event) {
        event.preventDefault();
        Router.go("/allItems");
    },

    'click .adminLink' : function (event) {
        event.preventDefault();
        Router.go("/admin");
    },

    //Sets the session variable for the student that is selected
    //along with setting the username for display on the graph legend
    'click .studentButton' : function (event) {
        var target = $(event.currentTarget);
        Session.set('currStudent', event.target.id);
        Session.set('currUsername', event.target.value);
        event.preventDefault();
        Router.go('/student');
    }
});

Template.allStudents.rendered = function () {
    // No longer used - see version history for previous code
};
