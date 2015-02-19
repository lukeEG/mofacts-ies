//////////////////////////////////////////////////////////////////////////
// Session helpers

/* *****************************************************************
 * All of our currently known session variables
 * *****************************************************************
 * clusterIndex
 * currentAnswer
 * currentQuestion
 * currentRootTdfName
 * currentTdfName
 * currentStimName
 * currentUnitNumber
 * debugging                 - Generic debugging flag
 * isScheduledTest
 * loginMode                 - untouched in sessionCleanUp
 * experimentTarget          - untouched in sessionCleanUp
 * experimentXCond           - untouched in sessionCleanUp
 * needResume
 * questionIndex
 * showOverlearningText
 * statsAnswerDetails        - Used by stats page template
 * statsRendered             - Used by stats page template
 * statsCorrect              - Used by stats page template
 * statsTotal                - Used by stats page template
 * statsPercentage           - Used by stats page template
 * statsUserTimeLogView      - User by stats page template
 * testType
 * usingACTRModel
 * */

//Handle an entire session - note that we current don't limit this to the
//client... but maybe we should?
sessionCleanUp = function() {
    Session.set("currentRootTdfName", undefined);
    Session.set("currentTdfName", undefined);
    Session.set("currentStimName", undefined);
    Session.set("clusterIndex", undefined);
    Session.set("currentAnswer", undefined);
    Session.set("currentQuestion", undefined);
    Session.set("currentUnitNumber", 0);
    Session.set("isScheduledTest", undefined);
    Session.set("needResume", false);
    Session.set("questionIndex", undefined);
    Session.set("showOverlearningText", undefined);
    Session.set("statsAnswerDetails", undefined);
    Session.set("statsRendered", false);
    Session.set("statsCorrect", undefined);
    Session.set("statsTotal", undefined);
    Session.set("statsPercentage", undefined);
    Session.set("statsUserTimeLogView", undefined);
    Session.set("testType", undefined);
    Session.set("usingACTRModel", undefined);

    //Special: we reset card probs and user progress when we reset the session
    if (Meteor.isClient) {
        initCardProbs();
        initUserProgress();
    }
};