var jsdom = require("jsdom");

function mailingListReporter(request,response)
{
	jsdom.env(
	  "http://lists.numenta.org/mailman/roster/nupic_lists.numenta.org",
	  ["http://code.jquery.com/jquery.js"],
	  function (errors, window) {
	  	var prvt = window.$("body").html().split("<p><em>(");
	  	var prvtnd = prvt[1];
	  	prvtnd = prvtnd.split(" ");
	  	prvtnd = prvtnd[0];
	  	var prvtd = prvt[2];
	  	prvtd = prvtd.split(" ");
	  	prvtd = prvtd[0];
	    response.write("Subscribers:\t");
	    response.write((window.$("a").length-4+parseInt(prvtnd)+parseInt(prvtd)).toString());
	    response.write("\n\nNumber of messages by month:\n");
	    nummsg(4,2013,0,response);
	  }
	);
}

function nummsg (month_in,year_in,total_in,response)
{

	var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	
	jsdom.env(
	  "http://lists.numenta.org/pipermail/nupic_lists.numenta.org/"+year_in+"-"+monthNames[month_in]+"/date.html",
	  ["http://code.jquery.com/jquery.js"],
	  function (errors, window) {
	    response.write(monthNames[month_in]);
	    response.write("\t");
	    response.write(((window.$("a").length-10)/2).toString());
	    response.write("\n");
	    var total = total_in + (window.$("a").length-10)/2;
	    var month = month_in;
	    var year = year_in;
	    month++;
	    if(month >= 12)
	    {

	    	year++;
	    	month = 0;

	    }
	    var date = new Date();
	    if(year <= date.getYear() || month <= date.getMonth())
	    {

	    	nummsg(month,year,total,response);

		}
		else
		{

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
    '/maillist': function(_, _, _) {
        return mailingListReporter;
    }
};