//////////////
//  EVENTS  //
//////////////

//TODO: we should be going back to instructions for each unit
//TODO: we don't handle instruction-only units right now

//TODO: reduce/refactor the server method calls

var timeoutName;
var timeoutCount = -1;
var permuted = [];

Template.cardTemplate.events({

    'focus #userAnswer' : function() {
        if(Session.get("debugging")){
            var probabilities = CardProbabilities.find({_id: Meteor.userId()});
            probabilities.forEach( function (prob) {
                console.log(prob);
            });
        }
    },
    'keypress #userAnswer' : function (e) {
        handleUserInput( e , "keypress");

    },
    'click .logoutLink' : function () {
        Meteor.logout( function (error) {
            if (typeof error !== "undefined") {
                //something happened during logout
                console.log("User:" + Meteor.user() +" ERROR:" + error);
            }
            else {
                Router.go("signin");
            }
        });
    },
    'click .homeLink' : function () {
        Router.go("profile");
    },

    'click .statsPageLink' : function () {
        Router.go("stats");
    },

    'click #overlearningButton' : function () {
        Router.go("profile");
    },
    'click .multipleChoiceButton' : function (event) {
        handleUserInput( event , "buttonClick");
    }
});

Template.cardTemplate.rendered = function() {
    newQuestionHandler();
}

/////////////////
//  VARIABLES  //
/////////////////

Template.cardTemplate.invokeAfterLoad = function() {

    if(Session.get("debugging")) {
        console.log('card loaded');
    }

    var file = Tdfs.findOne({fileName: getCurrentTdfName()});

    //the card loads frequently, but we only want to set this the first time
    if(Session.get("currentQuestion") == undefined){

        //check if tutor.setspec.isModeled is defined in the tdf
        if (file.tdfs.tutor.setspec[0].isModeled != undefined) {
            //if it is defined and is set to true, use the ACT-R Model methods.
            if (file.tdfs.tutor.setspec[0].isModeled == "true") {
                Session.set("usingACTRModel",true);
                initializeActRModel();
            } else {
                Session.set("usingACTRModel",false);
            }
        }
        
        //Before the below options, reset current test data
        resetCurrentTestData();

        prepareCard();
        Session.set("showOverlearningText", false);
    }

}

Template.cardTemplate.username = function () {
    if (typeof Meteor.user() === "undefined") {
        Router.go("signin");
        window.location.reload();
        //the reload is needed because for some reason the page contents show up as
        //empty unless we do the reload.
        return;
    } else {
        return Meteor.user().username;
    }
}

//determine the type of question to display
Template.cardTemplate.textCard = function() {
    return getQuestionType() === "text";
}

Template.cardTemplate.audioCard = function() {
    return getQuestionType() === "sound";
}

Template.cardTemplate.imageCard = function() {
    return getQuestionType() === "image";
}

//determine the type of question to display
Template.cardTemplate.test = function() {
    return getTestType() === "t";
}

Template.cardTemplate.study = function() {
    return getTestType() === "s";
}

Template.cardTemplate.drill = function() {
    return getTestType() === "d";
}

/////////////////
//  FUNCTIONS  //
/////////////////

function newQuestionHandler(){
    if ( Session.get("isScheduledTest") ) {
        var unitNumber = getCurrentUnitNumber();
        //question index = session's questionIndex -1 because it has already been incremented for the next card at this point.
        var questionIndex = Session.get("questionIndex") - 1;

        var file = Tdfs.findOne({fileName: getCurrentTdfName()});

        console.log(file + "is a scheduled test");

        var currUnit = file.tdfs.tutor.unit[unitNumber];

        if (currUnit.buttontrial && currUnit.buttontrial.length && currUnit.buttontrial[0] === "true") {
            $("#textEntryRow").hide();
            $("#multipleChoiceInnerContainer").remove();

            $("#multipleChoiceContainer").append(
                "<div id=\"multipleChoiceInnerContainer\"></div>"
            );

            var cluster = getStimCluster(getCurrentClusterIndex());

            var choicesArray = [];
            if (cluster.falseResponse && cluster.falseResponse.length) {
                for (var i = 0; i < cluster.falseResponse.length; ++i) {
                    choicesArray.push(cluster.falseResponse[i]);
                }
            }

            if (choicesArray.length < 1) {
                //Whoops - they didn't specify any alternate choices
                console.log("A button trial requires some false responses");
                currUnit.buttontrial = false;
                newQuestionHandler(); //RECURSE
                return;
            }

            //Currently we only show 4 option button trials - so we only
            //use 3 false responses
            if (choicesArray.length > 3) {
                Helpers.shuffle(choicesArray);
                choicesArray = choicesArray.splice(0, 3);
            }

            //Need to make sure they also have a correct option :)
            choicesArray.push(Session.get("currentAnswer"));
            Helpers.shuffle(choicesArray);

            //We can cheat here because we know from above we have <= 4 entries
            var labelArray = ["A", "B", "C", "D"];

            for (var i = 0; i < choicesArray.length; ++i) {
                var value = choicesArray[i];
                var label = labelArray[i];

                //insert all of the multiple choice buttons with the appropriate values.
                $("#multipleChoiceInnerContainer").append(
                    "<div class=\"col-lg-6\">" +
                        "<button type=\"button\" name=\"" + value + "\" class=\"btn btn-primary btn-block multipleChoiceButton\">" +
                            label + ": " + value +
                        "</button>" +
                    "</div>"
                );
            }
        }
    }

    startOnRender = startTimer();
    start = 0;

    //for debugging, allow one to turn on or off the timeout code.
    //Note to Future Self : Look up clearTimeout(timeoutObject);

    var AllowTimeouts = true;

    if(AllowTimeouts){
        timeoutCount++;
        var counter = UserProgress.find(
            { _id: Meteor.userId() },
            {progressDataArray: 1});

        counter.forEach(function (Object){
            length = Object.progressDataArray.length;
        });

        timeoutfunction(length, timeoutCount);
    }

    if(getQuestionType() === "sound"){
        console.log("Sound")
        document.getElementById('audio').play();
    }


    if (Session.get("showOverlearningText") == true) {
        $("#overlearningRow").show();
    }


}

function handleUserInput( e , source ) {


    //for debugging, allow one to turn on or off the UserInteraction code.
    var AllowUserInteraction = true;

    if ( source === "keypress") {
        var key=e.keyCode || e.which;
    } else if ( source === "buttonClick") {
        //to save space we will just go ahead and act like it was a key press.
        var key = 13;
    }

    if (key==13){

        //Gets User Response
        clearTimeout(timeoutName);

        var userAnswer;
        if ( source === "keypress") {
            userAnswer = Helpers.trim(document.getElementById('userAnswer').value.toLowerCase());
        } else if ( source === "buttonClick") {
            userAnswer = e.target.name;
        }

        //Check Correctness
        var answer = Helpers.trim(Session.get("currentAnswer")[0].toLowerCase());
        var isCorrect = true;
        //---------

        //Timer
        var elapsed = new Date().getTime()-start

        var elapsedOnRender = new Date().getTime()-startOnRender;

        //Display results
        if (userAnswer === "" || source === "buttonClick"){
            elapsed = 0;
        }

        //console.log(
        //    "You answered " + userAnswer + " in " + elapsed + " Milliseconds. The page was rendered for " + elapsedOnRender + " Milliseconds"
        //);

        //Display Correctness
        if ( getTestType() !== "s" ) {
            userAnswer = Helpers.trim(userAnswer.toLowerCase());
            answer = Helpers.trim(answer.toLowerCase());

            if (userAnswer.localeCompare(answer)) {
                isCorrect = false;
                if (Session.get("usingACTRModel")) {
                    incrementCurentQuestionsFailed();
                }
                if (getTestType() === "d") {
                    $("#UserInteraction").html("<font color= \"black\"> You are Incorrect." + " The correct answer is : " + answer +"</font>");
                }
            } else {
                if (Session.get("usingACTRModel")) {
                    incrementCurrentQuestionSuccess();
                }
                if (getTestType() === "d") {
                    $("#UserInteraction").html("<font color= \"black\">You are Correct. " + "Great Job</font>");
                }
            }
        }
        //---------

        //Get question Number
        var index = getCurrentClusterIndex();

        //Get whether text, audio or picture
        QType = findQTypeSimpified();
        if(source === "buttonClick"){
            //Assuming a multiple choice question if a button is clicked for an answer
            //add "Mc" to the log to differentiate normal questions from multiple ones ones in the log
            QType = "Mc"+QType;
        }

        //Gets the types type; study, drill, or test
        var TType = getTestType();

        //Write to Log
        Meteor.call("writing",index + ";" + TType + ";" + QType + ";" + userAnswer +";"+ isCorrect + ";" + elapsedOnRender +
            ";" + elapsed + "::" );

        Meteor.call("userTime", Session.get("currentTest"), {
            index: index,
            ttype: TType,
            qtype: findQTypeSimpified(),
            answer: userAnswer,
            isCorrect: isCorrect,
            elapsedOnRender: elapsedOnRender,
            elapsed: elapsed,
            action: "answer"
        });

        //record progress in UserProgress collection.
        recordProgress(index, Session.get("currentQuestion"), Session.get("currentAnswer"), userAnswer);

        if (Session.get("usingACTRModel")) {
            incrementNumQuestionsAnswered();
            calculateCardProbabilities();
        }

        //Reset timer for next question
        start = startTimer();
        
        //Whether timed or not, same logic for below
        var setup = function() {
            prepareCard();
            $("#userAnswer").val("");
            $("#UserInteraction").html("");
        };
        
        if(AllowUserInteraction) {
            //timeout for adding a small delay so the User may read
            //the correctness of his/her anwser
            $("#UserInteraction").show();
            Meteor.setTimeout(setup, 1000);
        }
        else {
            $("#UserInteraction").hide();
            setup();
        }
    }
    else{
        start = startTimer();
    }
}




function startTimer() {
    var start = new Date().getTime();
    return start
}

function prepareCard() {
    var file = Tdfs.findOne({fileName: getCurrentTdfName()});

    if (Session.get("usingACTRModel")) {
        getNextCardActRModel();
        return;
    }

    if (file.tdfs.tutor.unit && file.tdfs.tutor.unit.length) {
        Session.set("isScheduledTest", true);
        if (Session.get("questionIndex") === undefined) {
            Session.set("questionIndex", 0); //Session var should allow for continuation of abandoned tests, but will need to be reset for re-tests
            //Session.set("currentUnitNumber",0);
        }
        
        var unit = getCurrentUnitNumber();
        if (file.tdfs.tutor.unit[unit] === undefined) { //check to see if we've iterated over all units
            Router.go("stats");
            return;
        }

        var schedule = getSchedule();

        //If we're using permutations, permute the specified groups/items
        //Note that permuted is defined at the top of this file
        if (Session.get("questionIndex") === 0 &&  schedule.permute){
            permuted = permute(schedule.permute);
        }

        if (Session.get("questionIndex") === schedule.q.length){
            //if we are at the end of this unit
            Session.set("questionIndex", 0);
            Session.set("currentUnitNumber", unit + 1);
            prepareCard();
        }
        else {
            scheduledCard();
        }
    }
    else {
        Session.set("isScheduledTest", false);
        randomCard();
    }
}

function randomCard() {
    //get the file from the collection
    var file = Stimuli.findOne({fileName: getCurrentTestName()});
    //get the cluster size (avoids out of bounds error)
    var size = file.stimuli.setspec.clusters[0].cluster.length;

    //get a valid index
    var nextCardIndex = Math.floor((Math.random() * size));
    //set the question and answer
    Session.set("clusterIndex", nextCardIndex);
    Session.set("testType", "d"); //No test type given
    Session.set("currentQuestion", getStimQuestion(nextCardIndex));
    Session.set("currentAnswer", getStimAnswer(nextCardIndex));
    newQuestionHandler();
}

function getStimCluster(index) {
    var file = Stimuli.findOne({fileName: getCurrentTestName()});
    return file.stimuli.setspec.clusters[0].cluster[index];
}

//Return the current question type
function getQuestionType() {
    var type = "text"; //Default type

    //If we get called too soon, we just use the first cluster
    var clusterIndex = getCurrentClusterIndex();
    if (!clusterIndex && clusterIndex !== 0)
        clusterIndex = 0;

    var cluster = getStimCluster(clusterIndex);
    if (cluster.displayType && cluster.displayType.length) {
        type = cluster.displayType[0];
    }

    return ("" + type).toLowerCase();
}

//get the question at this index
function getStimQuestion(index) {
    return getStimCluster(index).display;
}

//get the answer at this index
function getStimAnswer(index) {
    return getStimCluster(index).response;
}

function scheduledCard() {
    var unit = getCurrentUnitNumber();
    var questionIndex = Session.get("questionIndex");

    //If we're using permutations, get index by perm array value (get
    //the permuted item) - otherwise just use the index we have
    var dispQuestionIndex;
    if (permuted.length > 0){
        dispQuestionIndex = permuted[questionIndex];
    }
    else {
        dispQuestionIndex = questionIndex;
    }

    var questInfo = getSchedule().q[dispQuestionIndex];
    var clusterIndex = questInfo.clusterIndex;

    //get the type of test (drill, test, study)
    Session.set("clusterIndex", clusterIndex);
    Session.set("testType", questInfo.testType);
    Session.set("currentQuestion", getStimQuestion(clusterIndex));
    Session.set("currentAnswer", getStimAnswer(clusterIndex));

    //Note we increment the session's question index number - NOT the
    //permuted index
    Session.set("questionIndex", questionIndex + 1);

    newQuestionHandler();
}

function getCurrentTestName() {
    return Session.get("currentTest");
}

function getCurrentUnitNumber() {
    return Session.get("currentUnitNumber");
}

function getCurrentTdfName() {
    return Session.get("currentTdfName");
}

function getCurrentClusterIndex() {
    return Session.get("clusterIndex");
}

function recordProgress ( questionIndex, question, answer, userAnswer ) {

    if (Meteor.userId() !== null) {

        //add to the progressDataArray
        UserProgress.update(
            { _id: Meteor.userId() },
            { $push:
                { progressDataArray :
                    {
                          questionIndex: questionIndex
                        , question: question
                        , answer: answer
                        , userAnswer: userAnswer
                    }
                }
            }
        );

    }
}

function resetCurrentTestData() {

    var file = Tdfs.findOne({fileName: getCurrentTdfName()});
    var tutor = file.tdfs.tutor;
    var currentTestMode;
    
    if (tutor.unit && tutor.unit.length) {
        currentTestMode = "SCHEDULED";
    }
    else {
        currentTestMode = "RANDOM";
    }

    if (Meteor.userId() !== null) {
        //update the currentTest and mode:
        //set the current test and mode, and clear the progress array.
        UserProgress.update(
            { _id: Meteor.userId() },
            {
                $set: {
                    currentStimuliTest: getCurrentTestName(),
                    currentTestMode: currentTestMode,
                    progressDataArray: [],
                    currentSchedule: {}
                }
            }
        );
    }
}

//Return the schedule for the current unit of the current lesson - 
//If it diesn't exist, then create and store it in User Progress
function getSchedule() {
    //Retrieve current schedule
    var progress = UserProgress.findOne({_id: Meteor.userId()});
    
    var unit = getCurrentUnitNumber();
    var schedule = null;
    if (progress.currentSchedule && progress.currentSchedule.unitNumber == unit) {
        schedule = progress.currentSchedule;
    }
    
    //Lazy create save if we don't have a correct schedule
    if (schedule === null) {
        console.log("CREATING SCHEDULE, showing progress");
        console.log(progress);
        
        var stims = Stimuli.findOne({fileName: getCurrentTestName()});
        var clusters = stims.stimuli.setspec.clusters[0].cluster;
        
        var file = Tdfs.findOne({fileName: getCurrentTdfName()});
        var setSpec = file.tdfs.tutor.setspec[0];
        var currUnit = file.tdfs.tutor.unit[unit];
        
        //TODO: if schedule is null then there was an error - should we stop
        //      or continue in error mode?  Probably stop with an error since
        //      the experiment is broken
        var schedule = AssessmentSession.createSchedule(setSpec, clusters, unit, currUnit);
        
        //We save the current schedule and also log it to the UserTime collection
        UserProgress.update(
            { _id: Meteor.userId() },
            { $set: { currentSchedule: schedule } }
        );
        
        Meteor.call("userTime", Session.get("currentTest"), {
            action: "schedule",
            unitname: Helpers.display(currUnit.unitname),
            unitindex: unit,
            schedule: schedule
        });
    }
    
    //Now they can have the schedule
    return schedule;
}

function initializeActRModel() {
    var file = Stimuli.findOne({fileName: getCurrentTestName()});
    var numQuestions = file.stimuli.setspec.clusters[0].cluster.length;

    //update the cards array to be empty
    CardProbabilities.update(
        { _id: Meteor.userId() },
        { $set:
            {
                  numQuestionsAnswered: 0
                , numQuestionsIntroduced: 0
                , cardsArray: []
            }
        }
    );
    //load all of the cards into the cards array.
    for (var i = 0; i < numQuestions; ++i) {
        CardProbabilities.update(
            { _id: Meteor.userId() },
            { $push:
                { cardsArray :
                    {
                          question: getStimQuestion(i)
                        , answer: getStimAnswer(i)
                        , questionSuccessCount: 0
                        , questionFailureCount: 0
                        , trialsSinceLastSeen: 0
                        , probability: 0
                        , hasBeenIntroduced: false
                    }
                }
            }
        );
    };

    //has to be done once ahead of time to give valid values for the beginning of the test.
    calculateCardProbabilities();
}

function incrementNumQuestionsAnswered() {
    CardProbabilities.update(
        { _id: Meteor.userId() },
        { $inc: { numQuestionsAnswered: 1 } }
    );
}

function incrementCurrentQuestionSuccess() {
    var incModifier = {$inc: {}};
    incModifier.$inc["cardsArray." + (getCurrentClusterIndex()) + ".questionSuccessCount"] = 1;
    CardProbabilities.update({ _id: Meteor.userId() }, incModifier);
}

function incrementCurentQuestionsFailed() {
    var incModifier = {$inc: {}};
    incModifier.$inc["cardsArray." + (getCurrentClusterIndex()) + ".questionFailureCount"] = 1;
    CardProbabilities.update({ _id: Meteor.userId() }, incModifier);
}

function resetTrialsSinceLastSeen( index ) {
    var setModifier = {$set: {}};
    setModifier.$set["cardsArray." + index + ".trialsSinceLastSeen"] = 0;
    CardProbabilities.update({ _id: Meteor.userId() }, setModifier);
}

function setHasBeenIntroducedFlag( index ) {
    var setModifier = {$set: {}};
    setModifier.$set["cardsArray." + index + ".hasBeenIntroduced"] = true;
    CardProbabilities.update({ _id: Meteor.userId() }, setModifier);
}

function setNextCardInfo( index ) {
    var cardProbs = CardProbabilities.findOne({ _id: Meteor.userId() });
    Session.set("clusterIndex", index);
    Session.set("currentQuestion", cardProbs.cardsArray[index].question);
    Session.set("currentAnswer", cardProbs.cardsArray[index].answer);
    resetTrialsSinceLastSeen(index);
    setHasBeenIntroducedFlag(index);
}

function incrementNumQuestionsIntroduced() {
    CardProbabilities.update(
        {_id: Meteor.userId()},
        { $inc: { numQuestionsIntroduced: 1 } }
    );
}

function getNumQuestionsIntroduced() {
    var cardProbs = CardProbabilities.findOne({ _id: Meteor.userId()});
    console.log(cardProbs);
    return cardProbs.numQuestionsIntroduced;
}

function getNumCardsBelow85( cardsArray ) {
    var counter = 0;
    for (var i = 0; i < cardsArray.length; ++i) {
        if (cardsArray[i].probability < 0.85) {
            ++counter;
        }
    };
    return counter;
}

function calculateCardProbabilities() {

    if (Session.get("debugging")) {
        console.log("calculating card probabilities...");
    }
    //TODO: IWB - 03/30/2014: still need to get actual values for these variables.
    //TODO: IWB - 04/02/2014: may need an entire collection to keep track of these variables.

    var cardProbs = CardProbabilities.findOne({ _id: Meteor.userId() });

    for(var i = 0; i < cardProbs.cardsArray.length; ++i) {

        var questionSuccessCount = cardProbs.cardsArray[i].questionSuccessCount;
        var questionFailureCount = cardProbs.cardsArray[i].questionFailureCount;
        var totalQuestionStudies = questionSuccessCount + questionFailureCount;
        var trialsSinceLastSeen = cardProbs.cardsArray[i].trialsSinceLastSeen;
        var totalTrials = cardProbs.numQuestionsAnswered;
        var trialsSinceLastSeenOverTotalTrials;

        if (totalTrials !== 0) { // can't devide by 0
            trialsSinceLastSeenOverTotalTrials = trialsSinceLastSeen/totalTrials;
        } else {
            trialsSinceLastSeenOverTotalTrials = 0;
        }

        var x = -3.0 + (2.4 * questionSuccessCount) + (0.8 * questionFailureCount) + totalQuestionStudies - (0.3 * trialsSinceLastSeenOverTotalTrials);
        var probability = 1.0/( 1.0 + Math.pow(Math.E, -x) );

        //set probability
        var setModifier = {$set: {}};
        setModifier.$set["cardsArray." + i + ".probability"] = probability;
        CardProbabilities.update({ _id: Meteor.userId() }, setModifier);

        //increment trialsSinceLastSeen
        var incModifier = {$inc: {}};
        incModifier.$inc["cardsArray." + i + ".trialsSinceLastSeen"] = 1;
        CardProbabilities.update({ _id: Meteor.userId() }, incModifier);
		
		//Log values for ACT-R system
		Meteor.call("recordActR", "\nsuccessful: " + questionSuccessCount + " ; " + "failed: " + questionFailureCount 
		+ " ; " + " since last seen: " + trialsSinceLastSeen + " ; " + "x: " +  x + " ; " + "probability: " + probability
		+ "\n");
    }

    if (Session.get("debugging")) {
        console.log("...done calculating card probabilities.");
    }
}

function getNextCardActRModel() {

    if (Session.get("debugging")) {
        console.log("getting next card...");
    }
    Session.set("testType", "d");

    var numItemsPracticed = CardProbabilities.findOne({ _id: Meteor.userId() }).numQuestionsAnswered;
    var cardsArray = CardProbabilities.findOne({ _id: Meteor.userId() }).cardsArray;

    if (numItemsPracticed === 0) {
        //introduce new card.  (#2 in the algorithm)
        var indexForNewCard = getIndexForNewCardToIntroduce( cardsArray );

        if (indexForNewCard === -1) {
            if (Session.get("debugging")) {
                console.log("ERROR: All cards have been introduced, but numQuestionsAnswered === 0");
            }
        } else {
            introduceNextCard(indexForNewCard);
        }

        if (Session.get("debugging")) {
            console.log("...got next card #2");
        }

        return;
    } else {

        var nextCardIndex = selectHighestProbabilityAlreadyIntroducedCardLessThan85(cardsArray);

        if ( nextCardIndex !== -1) {
            //number 3 in the algorithm
            setNextCardInfo(nextCardIndex);

            if (Session.get("debugging")) {
                console.log("...got next card #3");
            }

        } else {
            //numbers 4 and 5 in the algorithm.

            if (getNumCardsBelow85(cardsArray) === 0 && getNumQuestionsIntroduced() === cardsArray.length) {
                //number 5 in the algorithm.
                var indexForNewCard = selectLowestProbabilityCardIndex(cardsArray);
                introduceNextCard( indexForNewCard );

                Session.set("showOverlearningText", true);

                if (Session.get("debugging")) {
                    console.log("...got next card #5");
                }

            } else {
                //number 4 in the algorithm.
                var indexForNewCard = getIndexForNewCardToIntroduce(cardsArray);

                if (indexForNewCard === -1) {
                    //if we have introduced all of the cards.
                    indexForNewCard = selectLowestProbabilityCardIndex(cardsArray);
                    introduceNextCard( indexForNewCard );
                } else {
                    introduceNextCard(indexForNewCard);
                }

                if (Session.get("debugging")) {
                    console.log("...got next card #4");
                }

            }
        }

    }
}

function getIndexForNewCardToIntroduce( cardsArray ) {

    if (Session.get("debugging")) {
        console.log("getting index for new card to introduce.");
    }

    var indexToReturn = -1;

    for(var i = 0; i < cardsArray.length; ++i) {
        if (cardsArray[i].hasBeenIntroduced === false) {
            indexToReturn = i;
        }
    }

    if (Session.get("debugging")) {
        var message = "";
        if (indexToReturn === -1) {
            message = "All cards have been introduced!";
        } else {
            message = "about to introduce " + indexToReturn;
        }
        console.log(message);
    }

    if (indexToReturn !== -1) {
        // we introduced a new card.
        incrementNumQuestionsIntroduced();
    }

    return indexToReturn;
}

function introduceNextCard( index ) {
    if (Session.get("debugging")) {
        console.log("introducing next Card with index: " + index);
    }
    setNextCardInfo(index);
}

function selectHighestProbabilityAlreadyIntroducedCardLessThan85 ( cardsArray ) {
    if (Session.get("debugging")) {
        console.log("selectHighestProbabilityAlreadyIntroducedCardLessThan85");
    }
    var currentMaxProbabilityLessThan85 = 0;
    var indexToReturn = -1;

    for (var i = 0; i < cardsArray.length; ++i) {

        if (cardsArray[i].hasBeenIntroduced === true && cardsArray[i].trialsSinceLastSeen > 2) {

            if (cardsArray[i].probability > currentMaxProbabilityLessThan85 && cardsArray[i].probability < 0.85) {
                currentMaxProbabilityLessThan85 = cardsArray[i].probability;
                indexToReturn = i;
            }
        }
    };

    if (Session.get("debugging")) {
        var message;
        if (indexToReturn === -1) {
            message = "no cards less than .85 already introduced.";
        } else {
            message = "indexToReturn: " + indexToReturn;
        }
        console.log(message);
    }

    return indexToReturn;
}

function selectLowestProbabilityCardIndex( cardsArray ) {

    if (Session.get("debugging")) {
        console.log("selectLowestProbabilityCard");
    }

    var currentMinProbability = 1;
    var indexToReturn = 0;

    for (var i = 0; i < cardsArray.length; ++i) {
        if (cardsArray[i].probability < currentMinProbability  && cardsArray[i].trialsSinceLastSeen > 2) {
            currentMinProbability = cardsArray[i].probability;
            indexToReturn = i;
        }
    };

    if (Session.get("debugging")) {
        console.log("indexToReturn: " + indexToReturn);
    }

    return indexToReturn;
}

function timeoutfunction(index, timeoutNum){

    var counter = UserProgress.find(
        { _id: Meteor.userId() },
        {progressDataArray: 1});

    counter.forEach(function (Object){
        length = Object.progressDataArray.length;
    });

    //needs to be in tdf someday
    //the timeout in Seconds is multipled by 1000 to conver to milliseconds

    var file = Tdfs.findOne({fileName: getCurrentTdfName()});
    var tis = file.tdfs.tutor.setspec[0].timeoutInSeconds[0];

    var delay = tis * 1000;

    timeoutName = Meteor.setTimeout(function(){

        if(index === length && timeoutNum > 0){
            console.log("TIMEOUT "+timeoutCount+": " + index +"|"+length);

            Meteor.call("writing",getCurrentClusterIndex() + ";" +
                findQTypeSimpified() + ";" + "[TIMEOUT]" +";"+ "false" + ";" + delay +
                ";" + 0 + "::" );

            Meteor.call("userTime", Session.get("currentTest"), {
                index: getCurrentClusterIndex(),
                qtype: findQTypeSimpified(),
                action: "[TIMEOUT]",
                delay: delay
            });

            recordProgress(getCurrentClusterIndex(), Session.get("currentQuestion"), Session.get("currentAnswer"), "[TIMEOUT]");

            if (Session.get("usingACTRModel")) {
                incrementCurentQuestionsFailed();
                incrementNumQuestionsAnswered();
                calculateCardProbabilities();
            }


            prepareCard();
        }else{
            //Do Nothing
        }


    }, delay);
}

function findQTypeSimpified(){

    var QType = getQuestionType();

    if (QType == "text"){
        QType = "T";    //T for Text
    } else if (QType == "image"){
        QType = "I";    //I for Image
    } else if (QType == "sound"){
        QType = "A";    //A for Audio
    } else {
        QType = "NA";   //NA for Not Applicable
    }

    return QType;
}

function getTestType(){
    return Session.get("testType");
}

//NOTE - permuted array is a SHALLOW COPY - which is different from
//shuffle in Helpers
function permute (perms) {
    var final_perm = []
    var groups = perms.split("|");
    for(i=0; i < groups.length; i++){

        var indexSets = groups[i].split(",");
        permutedArray = Helpers.shuffle(indexSets);
        for(j=0; j < permutedArray.length; j++){
            final_perm.push(permutedArray[j]);

        }
    }
    return final_perm;
}
