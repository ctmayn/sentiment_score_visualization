//The array that will store all the reviews
    var data = [];
    //Arrays that store the average negative and positive sentiments for each score
    var averageNeg = [0, 0, 0, 0, 0, 0];
    var averageNeu = [0, 0, 0, 0, 0, 0];
    var averagePos = [0, 0, 0, 0, 0, 0];
    //Arrays that store the total negative and positive sentiments for each score
    var totalPos = [0, 0, 0, 0, 0, 0];
    var totalNeu = [0, 0, 0, 0, 0, 0];
    var totalNeg = [0, 0, 0, 0, 0, 0];
    //The number of reviews for each score 
    var numReviews = [0, 0, 0, 0, 0, 0];
    //The standard deviations of the positive and negative sentiments
    var standDevNeu = [0, 0, 0, 0, 0, 0];
    var standDevNeg = [0, 0, 0, 0, 0, 0];
    var standDevPos = [0, 0, 0, 0, 0, 0];
    
    class sentimentVsScoreGraph{
    }
    
    sentimentVsScoreGraph.prototype.load = function(){
      //This http request gets one review to determine the number of reviews to be read in.
      var getFirstReview = new XMLHttpRequest();
      var getFirstReviewURL = "http://peerlogic.csc.ncsu.edu/datawarehouse/answers?comment_len={\"gt\":5}&score={\"ne\":null}&pagelength=1&page=1";
      getFirstReview.open("GET", getFirstReviewURL, true);
      getFirstReview.setRequestHeader("Content-type", "'application/json; charset=UTF-8");
      getFirstReview.onload = function() {
        if(getFirstReview.readyState == 4 && getFirstReview.status == 200) {
           startProcessing(getFirstReview.responseText);
          }
      }
      getFirstReview.send();
    }
    
    /**
      *Once we have one review, we can determine the number of reviews that are in the database that meet our criteria
      *Then we can get all the reviews with one request.
    */
    function startProcessing(first_reviews){
      var raw_reviews = JSON.parse(first_reviews);
      //Get the number of reviews there are in the data warehouse that fit the criteria
      var numPages = raw_reviews.totalpages;
      //Now we can get all the reviews that fit the criteria
      var getReviews = new XMLHttpRequest();
      getReviewsURL = "http://peerlogic.csc.ncsu.edu/datawarehouse/answers?comment_len={\"gt\":5}&score={\"ne\":null}&orderby=criterion_id&page=1&pagelength="  + numPages;
      getReviews.open("GET", getReviewsURL, true);
      getReviews.onload = function() {
        if(getReviews.readyState == 4 && getReviews.status == 200) {
          raw_reviews = JSON.parse(getReviews.responseText);
          getFirstCriteria(raw_reviews);
        }
      }
      getReviews.send();
    }
    
    function getFirstCriteria(reviewList){
      var getRating = new XMLHttpRequest();
      var getRatingURL = "http://peerlogic.csc.ncsu.edu/datawarehouse/criteria?pagelength=1";
      getRating.open("GET", getRatingURL, true);
      getRating.setRequestHeader("Content-type", "'application/json; charset=UTF-8");
      getRating.onload = function() {
        if(getRating.readyState == 4 && getRating.status == 200) {
            getCriteria(reviewList, JSON.parse(getRating.responseText));
          }
      }
      getRating.send()
    }
    
    function getCriteria(reviewList, firstCriterion){
      var getRatings = new XMLHttpRequest();
      var getRatingsURL = "http://peerlogic.csc.ncsu.edu/datawarehouse/criteria?pagelength=" + firstCriterion.totalpages;
      getRatings.open("GET", getRatingsURL, true);
      getRatings.setRequestHeader("Content-type", "'application/json; charset=UTF-8");
      getRatings.onload = function() {
        if(getRatings.readyState == 4 && getRatings.status == 200) {
          sentiments= [];
          processReviews(reviewList, 0, sentiments, getRatings.responseText);
        }
      }
      getRatings.send()
    }
    
    /**
      *Once we have all the reviews we will need to filter them into seperate lists.  One will be used to pass into the 
      *Sentiment analysis webservice the other will be used to store the filtered data
    */
    function processReviews(raw_reviews, position, sentiments, criterion){
      //Make a new object that contains an array that can be will be used to get the negative and positive sentiment via the sentiment analysis webservice
      var reviewPOSTList = new Object();
      reviewPOSTList.reviews = [];
      for(var i = position; i < position + 7500 && i < raw_reviews.records.length; i++ ){
        //make a review object to store on the lists
        var review = new Object();
        //Add the id and text to the review
        review.id = raw_reviews.records[i].id;
        review.text = raw_reviews.records[i].comment;
        //Push it onto the list being sent to the sentiment analysis webservice.
        reviewPOSTList.reviews.push(review);
      }
      //The http request for getting sentiment
      var getSentiment = new XMLHttpRequest();
      var getSentimentURL = "http://peerlogic.csc.ncsu.edu/sentiment/analyze_reviews_bulk";
      getSentiment.open("POST", getSentimentURL, true);
      getSentiment.setRequestHeader("Content-type", "application/json; charset=UTF-8");
      getSentiment.onreadystatechange = function() {
        if(getSentiment.readyState == 4 && getSentiment.status == 200) {
          if(position + 7500 <= raw_reviews.records.length){
            new_reviews = JSON.parse(getSentiment.responseText);
            sentiments = sentiments.concat(new_reviews.sentiments);
            processReviews(raw_reviews, position + 7500, sentiments, criterion);
          } else {
            new_reviews = JSON.parse(getSentiment.responseText);
            sentiments = sentiments.concat(new_reviews.sentiments);
            totalSentiment(sentiments, raw_reviews, criterion);
          }
        }
      }
      getSentiment.send(JSON.stringify(reviewPOSTList));
    }
    
    
    
    /**
      *This function takes the reviews and the sentiment derived by the webservice and compibines them into object which
      * are then pushed to the data array which is used for storing the review data.
    */
    function totalSentiment(sentiments, reviewList, rawCriterion){
      var criteria = [];
      var rating_criteria = JSON.parse(rawCriterion);
      for(var i = 0; i < rating_criteria.records.length; i++){
        if(rating_criteria.records[i].min_score.length != 0){
          var criterion = new Object();
          criterion.id = rating_criteria.records[i].id;
          criterion.min = parseInt(rating_criteria.records[i].min_score);
          criterion.max = parseInt(rating_criteria.records[i].max_score);
          criteria.push(criterion);
        }
      }
      //For each review we will take the necessary info from both of the lists and add them to an objec which will be pushed to the data list
      var index = 0;
      for(var i = 0; i < reviewList.records.length; i++ ){
        var completeReviewData = new Object();
        while(reviewList.records[i].criterion_id != criteria[index].id){
          index++;
          if(index >= criteria.length){
            i++;
            index = 0;
          }
        }
        completeReviewData.score = Math.floor(parseInt(reviewList.records[i].score)/(criteria[index].max - criteria[index].min) * 5);
        completeReviewData.postone = parseFloat(sentiments[i].pos);
        completeReviewData.neutone = parseFloat(sentiments[i].neu);
        completeReviewData.negtone = parseFloat(sentiments[i].neg);
        data.push(completeReviewData);
      }
      calculateData(drawing);
    }
    /**
     *Does all the major calculating of the data like average sentiment and standard devaiation.
    */
    function calculateData(callback){
      //Find the total sentiment of all the reviews of a certain score then increment number of reviews for that score range 
      for(var i = 0; i < data.length; i++){
        if(data[i].score < 6){
          totalPos[data[i].score] += data[i].postone;
          totalNeu[data[i].score] += data[i].neutone;
          totalNeg[data[i].score] += data[i].negtone;
          numReviews[data[i].score]++;
          }
      }
      //Find the averages for the negative and positive reviews for each score range
      for(var i = 0; i < 6; i++){
        averageNeg[i] = totalNeg[i] / numReviews[i];
        averageNeu[i] = totalNeu[i] / numReviews[i];
        averagePos[i] = totalPos[i] / numReviews[i];
      }
      //Find the total standard devaiation of all the reviews of a certain score
      for(var i = 0; i < data.length; i++){
        if(data[i].score < 6){
          standDevPos[data[i].score] += (data[i].postone - averagePos[data[i].score]) * (data[i].postone - averagePos[data[i].score]);
          standDevNeu[data[i].score] += (data[i].neutone - averageNeu[data[i].score]) * (data[i].neutone - averageNeu[data[i].score]);
          standDevNeg[data[i].score] += (data[i].negtone - averageNeg[data[i].score]) * (data[i].negtone - averageNeg[data[i].score]);
          }
      }
      //Find the standard devaiations by dividing by the number of reviews for that score then square rooting the value.
      for(var i = 0; i < averageNeg.length; i++){
        standDevNeg[i] = Math.sqrt(standDevNeg[i] / numReviews[i]);
        standDevNeu[i] = Math.sqrt(standDevNeu[i] / numReviews[i]);
        standDevPos[i] = Math.sqrt(standDevPos[i] / numReviews[i]);
      }
      callback();
    }
    /**
      *The function to draw the graph
    */
    var drawing = function drawGraph(){ 
      //The width of the height of the graph
      var width = 750;
      var height = 750;
      
      var deviationLinePadding = width/100;
      //The width of the legend
      var legendWidth = width  / 4;
      var legendHeight =height / 8;
      
      //the margins scaled to the hieght and width of the graph
      var margin = {top: height/50, bottom: height/5, right: width/50, left: width/8};
      
      //This is used to find the maximum value of sentiment that needs to be shown on the graph rounded to the nearest tenth
      var max = 0;
      for(var i = 0; i < 6; i++){
        if(max < averagePos[i] + standDevPos[i]){
          max = averagePos[i] + standDevPos[i];
        }
        if(max < averageNeg[i] + standDevNeg[i]){
          max = averageNeg[i] + standDevNeg[i];
        }
        if(max < averageNeu[i] + standDevNeu[i]){
          max = averageNeu[i] + standDevNeu[i];
        }
      }
      max = Math.ceil(max * 10) /10;
      
      if( max > 1){
        max = 1;
      }
      
      //The scale for the x direction, the domain for this is the possible score values 0 - 5
      var xScale = d3.scale.ordinal().rangeRoundBands([margin.left, width -  margin.right] , .1)
          .domain(["0", "1", "2", "3", "4", "5"]);
          
      //The scale for the y direction,  The domain for this is from 0 to the maximum score
      var yScale = d3.scale.linear().range([height - margin.bottom, margin.top]);
          yScale.domain([0, max]);
          
      //Set up the x axis at the bottom with no ticks
      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickSize(0);
        
      //Set up the y axis on the left
      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");
        
      //Set up the chart region
      var chart = d3.select(".chart")
        .attr("width", width + legendWidth)
        .attr("height", height);
        
      //Add the label for the y axis  
      chart.append("text")
          .attr("text-anchor", "middle") 
          .attr("transform", "translate(" + margin.left/4 + "," + (height/2 - 4 * margin.top)+")rotate(-90)")
          .attr("font-size", height/35)
          .text("Average Compound Sentiment");
      //Add the label for the x axis 
      chart.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", "translate("+ (width/2 + margin.left/2) +","+ (height - height / 8) + ")")
          .attr("font-size", width/35)
          .text("Score");
          
      //Calculate which value in the x scale domain that piece of data belong to.
      var x = function(d, i){
        if(i == 0){
          return "0";
        }
        if(i == 1){
          return "1";
        }
        if(i == 2){
          return "2";
        }
        if(i == 3){
          return "3";
        }
         if(i == 4){
          return "4";
        }
        return "5";
      };
      
      //Make sure the tooltip is currently not visible
      var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("display", "none");
        
      //When the mouse hovers ofver the object will become visible
      function mouseover() {
        tooltip.style("display", "inline");
      }
      
      //When the mouse moves out of the object the tooltip becomes invisible again
      function mouseout() {
        tooltip.style("display", "none");
      }
      
      //Move the x axis to the appropriate position
      chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height - margin.bottom)  + ")")
        .call(xAxis);
        
      //Move the y axis to the appropriate position
      chart.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(yAxis);
      
      //Draw all the bars for each average negative sentiment
      chart.selectAll(".negbar")
        .data(averageNeg)
        .enter().append("rect")
          .attr("class", "negbar")
          .attr("x", function(d, i) { return xScale(x(d, i))})
          .attr("y", function(d, i){return yScale(averageNeg[i])})
          .attr("height", function(d, i) { return height - yScale(averageNeg[i]) -  margin.bottom})
          .attr("width", (xScale.rangeBand())/3)
          .on("mouseover", mouseover)
          .on("mousemove", function(d, i){
            tooltip
              .html("Number of reviews: " + numReviews[i] + "</br>Average Negative Sentiment: "  + d3.round(averageNeg[i], 3) + "</br>Standard Deviation: " + d3.round(standDevNeg[i], 3))
              .style("left", d3.event.pageX + "px")
              .style("top", (d3.event.pageY - 69) + "px");
          })
          .on("mouseout", mouseout);
      
      //Draw all the bars for each average negative sentiment
      chart.selectAll(".neubar")
        .data(averageNeu)
        .enter().append("rect")
          .attr("class", "neubar")
          .attr("x", function(d, i) { return xScale(x(d, i))  + xScale.rangeBand()/3 })
          .attr("y", function(d, i){return yScale(averageNeu[i])})
          .attr("height", function(d, i) { return height - yScale(averageNeu[i]) -  margin.bottom})
          .attr("width", (xScale.rangeBand())/3)
          .on("mouseover", mouseover)
          .on("mousemove", function(d, i){
            tooltip
              .html("Number of reviews: " + numReviews[i] + "</br>Average Negative Sentiment: "  + d3.round(averageNeu[i], 3) + "</br>Standard Deviation: " + d3.round(standDevNeu[i], 3))
              .style("left", d3.event.pageX + "px")
              .style("top", (d3.event.pageY - 69) + "px");
          })
          .on("mouseout", mouseout);
      
      //Draw all the bars for average positive sentiment
      chart.selectAll(".posbar")
        .data(averagePos)
        .enter().append("rect")
          .attr("class", "posbar")
          .attr("y", function(d, i){return yScale(averagePos[i])})
          .attr("x", function(d, i) { return (xScale(x(d, i)) + 2 * xScale.rangeBand()/3)})
          .attr("height", function(d, i) { return height - yScale(averagePos[i]) -  margin.bottom})
          .attr("width", xScale.rangeBand()/3)
          .on("mouseover", mouseover)
          .on("mousemove", function(d, i){
             tooltip
              .html("Number of reviews: " + numReviews[i] + "</br>Average Positive Sentiment: "  + d3.round(averagePos[i], 3) + "</br>Standard Deviation: " + d3.round(standDevPos[i], 3))
              .style("left", d3.event.pageX + "px")
              .style("top", (d3.event.pageY - 69) + "px");
          })
          .on("mouseout", mouseout);
       
      //Draw the upper part of the negative standard devation line
      chart.selectAll(".upperNegStandDevLine")
        .data(standDevNeg)
        .enter().append("line")
          .attr("class", "negLine")
          .attr("x1", function(d, i) { return xScale(x(d, i)) + deviationLinePadding})
          .attr("y1", function(d, i){return yScale(averageNeg[i] + standDevNeg[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + (xScale.rangeBand())/3 - deviationLinePadding})
          .attr("y2", function(d, i){return yScale(averageNeg[i] + standDevNeg[i])});
      
       //Draw the lower part of the negative standard devation line
      chart.selectAll(".lowerNegStandDevLine")
        .data(standDevNeg)
        .enter().append("line")
          .attr("class", "negLine")
          .attr("x1", function(d, i) { return xScale(x(d, i)) + deviationLinePadding})
          .attr("y1", function(d, i){return yScale(averageNeg[i] - standDevNeg[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + (xScale.rangeBand())/3 - deviationLinePadding})
          .attr("y2", function(d, i){return yScale(averageNeg[i] - standDevNeg[i])});
          
      //Draw the line connecting the upper and lower parts of the negative standard devaiation line
      chart.selectAll(".negConnectingLine")
        .data(standDevNeg)
        .enter().append("line")
          .attr("class", "negLine")
          .attr("x1", function(d, i) { return xScale(x(d, i)) + (xScale.rangeBand())/6})
          .attr("y1", function(d, i){return yScale(averageNeg[i] - standDevNeg[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + (xScale.rangeBand())/6})
          .attr("y2", function(d, i){return yScale(averageNeg[i] + standDevNeg[i])});
      
      //Draw the upper part of the neutral standard devation line
      chart.selectAll(".upperNeuStandDevLine")
        .data(standDevNeu)
        .enter().append("line")
          .attr("class", "negLine")
          .attr("x1", function(d, i) { return xScale(x(d, i)) + xScale.rangeBand()/3 + deviationLinePadding})
          .attr("y1", function(d, i){return yScale(averageNeu[i] + standDevNeu[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + (2 * xScale.rangeBand())/3 - deviationLinePadding})
          .attr("y2", function(d, i){return yScale(averageNeu[i] + standDevNeu[i])});
      
       //Draw the lower part of the neutral standard devation line
      chart.selectAll(".lowerNeuStandDevLine")
        .data(standDevNeu)
        .enter().append("line")
          .attr("class", "negLine")
          .attr("x1", function(d, i) { return xScale(x(d, i)) + xScale.rangeBand()/3 + deviationLinePadding})
          .attr("y1", function(d, i){return yScale(averageNeu[i] - standDevNeu[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + ( 2 * xScale.rangeBand())/3 - deviationLinePadding})
          .attr("y2", function(d, i){return yScale(averageNeu[i] - standDevNeu[i])});
          
      //Draw the line connecting the upper and lower parts of the neutral standard devaiation line
      chart.selectAll(".neuConnectingLine")
        .data(standDevNeu)
        .enter().append("line")
          .attr("class", "negLine")
          .attr("x1", function(d, i) { return xScale(x(d, i)) + (xScale.rangeBand())/2})
          .attr("y1", function(d, i){return yScale(averageNeu[i] - standDevNeu[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + (xScale.rangeBand())/2})
          .attr("y2", function(d, i){return yScale(averageNeu[i] + standDevNeu[i])});
      
      //Draw the upper part of the positive standard devation line
      chart.selectAll(".upperPosStandDevLine")
        .data(standDevPos)
        .enter().append("line")
          .attr("class", "posLine")
          .attr("x1", function(d, i) { return (xScale(x(d, i)) + 2 * (xScale.rangeBand())/3) + deviationLinePadding})
          .attr("y1", function(d, i){return yScale(averagePos[i] + standDevPos[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + xScale.rangeBand() - deviationLinePadding})
          .attr("y2", function(d, i){return yScale(averagePos[i] + standDevPos[i])});
       
      //Draw the lower part of the positive standard devation line
      chart.selectAll(".lowerPosStandDevLine")
        .data(standDevPos)
        .enter().append("line")
          .attr("class", "posLine")
          .attr("x1", function(d, i) { return (xScale(x(d, i)) + 2 * (xScale.rangeBand())/3) + deviationLinePadding})
          .attr("y1", function(d, i){return yScale(averagePos[i] - standDevPos[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + xScale.rangeBand() - deviationLinePadding})
          .attr("y2", function(d, i){return yScale(averagePos[i] - standDevPos[i])});
     
      //Draw the line connecting the upper and lower parts of the negative standard devaiation line
      chart.selectAll(".posConnectingLine")
        .data(standDevPos)
        .enter().append("line")
          .attr("class", "posLine")
          .attr("x1", function(d, i) { return (xScale(x(d, i)) + 5 * (xScale.rangeBand())/6)})
          .attr("y1", function(d, i){return yScale(averagePos[i] - standDevPos[i])})
          .attr("x2", function(d, i) { return xScale(x(d, i)) + 5 * (xScale.rangeBand())/6})
          .attr("y2", function(d, i){return yScale(averagePos[i] + standDevPos[i])});
      
      //Draw the box around the legend
      var legend = chart.append("rect")
        .attr("class", "legend")
        .attr("x", width - 1)
        .attr("y", margin.top)
        .attr("height", legendHeight)
        .attr("width", legendWidth);
      
      var legend_padding_width = legendWidth/20;
      var legend_padding_height = legendHeight/10;
      
      //Draw the icon indicating the negative bar
      chart.append("rect")
        .attr("class", "negbar")
        .attr("x", width + legend_padding_width)
        .attr("y", margin.top + legend_padding_height)
        .attr("height", legendHeight/5)
        .attr("width", legendWidth/10);
      
      //Draw the icon indicating the positive bar
      chart.append("rect")
        .attr("class", "neubar")
        .attr("x", width + legend_padding_width)
        .attr("y", margin.top + legend_padding_height + (legendHeight - legend_padding_height)/3)
        .attr("height", legendHeight/5)
        .attr("width", legendWidth/10);
      
      //Draw the icon indicating the positive bar
      chart.append("rect")
        .attr("class", "posbar")
        .attr("x", width + legend_padding_width)
        .attr("y", margin.top + legend_padding_height + 2 * (legendHeight - legend_padding_height)/3)
        .attr("height", legendHeight/5)
        .attr("width", legendWidth/10);
      
      //Add the label for the negative sentiment icon.
      chart.append("text")
        .attr("x", width + legendWidth/5)
        .attr("y", margin.top + 2.4 * legend_padding_height)
        .attr("font-size", legend_padding_height * 1.8 + "px")
        .html("- Negative Sentiment");
      
      //Add the label for the positive sentiment icon
      chart.append("text")
        .attr("x", width + legendWidth/5)
        .attr("y",margin.top + 2.4 * legend_padding_height + (legendHeight - legend_padding_height)/3)
        .attr("font-size", legend_padding_height * 1.8 + "px")
        .html("- Neutral Sentiment");
      
      //Add the label for the positive sentiment icon
      chart.append("text")
        .attr("x", width + legendWidth/5)
        .attr("y",margin.top + 2.4 * legend_padding_height + 2 * (legendHeight - legend_padding_height)/3)
        .attr("font-size", legend_padding_height * 1.8 + "px")
        .html("- Positive Sentiment");
    }