search = function(key, prop, array){
  for(var i=0;i<array.length;i++){
    if(array[i][prop] === key){
      return array[i];
    }
  }
}

getAllClassesForCurrentInstructor = function(instructorID){
  var curClasses = [];
  if (Roles.userIsInRole(Meteor.user(), ["admin"])){
    Classes.find({}).forEach(function(entry){
      curClasses.push(entry);
    });
  }else{
    Classes.find({instructor:instructorID}).forEach(function(entry){
      curClasses.push(entry);
    });
  }
  return curClasses;
}

getAllNamesOfTdfsAttempted = function(studentID){
  var allNamesOfTdfsAttempted = [];

  UserMetrics.find({"_id":studentID}).forEach(function(entry){
    console.log("userMetric: " + JSON.stringify(entry));
    var possibleTdfs = _.filter(_.keys(entry), x => x.indexOf("_xml") != -1)
    for(var index in possibleTdfs){
      var possibleTdf = possibleTdfs[index];
      console.log(possibleTdf);
      if(possibleTdf.indexOf("_xml") != -1){
        var curTdfName = possibleTdf;
        var replacement = ".";
        //Replace only last underscore with "." to reconstruct actual tdf name
        curTdfName = curTdfName.replace("_xml",".xml");
        allNamesOfTdfsAttempted.push(curTdfName);
      }
    }
  });

  return allNamesOfTdfsAttempted;
}

getStudentPerformance = function(studentUsername,curTdf){
  var tdfQueryName = curTdf.replace(".","_");
  var count = 0;
  var numCorrect = 0;
  var totalTime = 0;
  var student = Meteor.users.findOne({"username":studentUsername});
  var studentID = null;
  if(!!student){
    studentID = student._id;
  }
  UserMetrics.find({_id:studentID}).forEach(function(entry){
    var tdfEntries = _.filter(_.keys(entry), x => x.indexOf(tdfQueryName) != -1);
    for(var index in tdfEntries){
      var key = tdfEntries[index];
      var tdf = entry[key];
      for(var index in tdf){
        var stim = tdf[index];
        count += stim.questionCount || 0;
        numCorrect += stim.correctAnswerCount || 0;
        var answerTimes = stim.answerTimes;
        for(var index in answerTimes){
          var time = answerTimes[index];
          totalTime += (time / (1000*60)); //Covert to minutes from milliseconds
        }
      }
    }
  });
  var percentCorrect = "N/A";
  if(count != 0){
    percentCorrect = (numCorrect / count).toFixed(4)*100  + "%";
  }
  totalTime = totalTime.toFixed(1);
  var studentObj = {
    "username":studentUsername,
    "count":count,
    "percentCorrect":percentCorrect,
    "numCorrect":numCorrect,
    "totalTime":totalTime
  }
  return studentObj;
}
