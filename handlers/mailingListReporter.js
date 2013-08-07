var jsdom = require("jsdom");

var START_MONTH = 4;
var START_YEAR = 2013;

function mailingListReporter(request,response)    {
    jsdom.env(
      "http://lists.numenta.org/mailman/roster/nupic_lists.numenta.org",
      ["http://code.jquery.com/jquery.js"],
      function (errors, window) {
        var numberSubs = window.$("center b font");
        var numberSubsNDigest = numberSubs[0];
        numberSubsNDigest = numberSubsNDigest.innerHTML.split(" ");
        var numberSubsDigest = numberSubs[1];
        numberSubsDigest = numberSubsDigest.innerHTML.split(" ");
        response.write("Subscribers:\t");
        response.write((parseInt(numberSubsNDigest[0]) + parseInt(numberSubsDigest[0])).toString());
        response.write("\n\nNumber of messages by month:\n");
        countMessagesPerMonth(START_MONTH,START_YEAR,0,response);
      }
    );
}

function countMessagesPerMonth (month_in,year_in,total_in,response)    {

    var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    jsdom.env(
      "http://lists.numenta.org/pipermail/nupic_lists.numenta.org/"+year_in+"-"+monthNames[month_in]+"/date.html",
      ["http://code.jquery.com/jquery.js"],
      function (errors, window)    {
        response.write(monthNames[month_in]);
        response.write("\t");
        response.write(((window.$("a").length-10)/2).toString());
        response.write("\n");
        var total = total_in + (window.$("a").length-10)/2;
        var month = month_in;
        var year = year_in;
        month++;
        if(month >= 12)    {

            year++;
            month = 0;

        }
        var date = new Date();
        if(year <= date.getYear() || month <= date.getMonth())    {

            countMessagesPerMonth(month,year,total,response);

        }    else    {

            response.write("TOTAL:\t");
            response.write(total.toString());
            response.end();

        }
      }
    );

}


mailingListReporter.name = 'Mailing List Reporter';
mailingListReporter.description = 'Provides statistics about the mailing list.';

module.exports = {
    '/maillist': function() {
        return mailingListReporter;
    }
};