Indepenedent Study by: Christopher Maynard
Guided by: Dr. Edward Gehringer & Mr. Ferry Pramudianto

Using visualizations to display the data in the peer assessment data warehouse:

In the PeerLogic data warehouse, there is a lot of data stored from many different peer-review services.  My assignment for the my independent study was to visualize some of this data.  Through my program, you can see the correlation between the positive, negative, and neutral sentiment and the score.  This information will be presented through a graph and will be used for possible research or for general information about the data in the data warehouse.

Services Used:

  1. Sentiment Analysis by PeerLogic
    This sentiment analysis service is implemented with VADER (Valence Aware Dictionary and sEntiment Reasoner), which a lexicon and rule-  based sentiment analysis tool. It is specifically attuned to sentiments expressed in social media, but it is also generally applicable to sentiment analysis in other domains
    http://peerlogic.csc.ncsu.edu/sentiment/developer
    
    In this project, lots of reviews needed to be analyzed, so I used the bulk sentiment analyzer at http://peerlogic.csc.ncsu.edu/sentiment/analyze_reviews_bulk
    Inputs: A JSON string in the following format:
      {
        "reviews":[
          {"id":"1","text":"bad"},
          {"id":"2","text":"not bad"},
          {"id":"3","text":"good"}
        ]
      }
      
    Outputs: A JSON string in the following format:
      {
        "sentiments": [
          {
            "id": "1",
            "neg": "1.00",
            "neu": "0.00",
            "pos": "0.00",
            "sentiment": "-0.54",
            "text": "bad"
          },
          {
            "id": "2",
            "neg": "0.00",
            "neu": "0.26",
            "pos": "0.74",
            "sentiment": "0.43",
            "text": "not bad"
          },
          {
            "id": "3",
            "neg": "0.00",
            "neu": "0.00",
            "pos": "1.00",
            "sentiment": "0.44",
            "text": "good"
          }
        ]
      }
      
Usage:
  
To use this, you will need to download the sentimentVsScore.js as well as the css.

You will then need to import the javascript file using this line:
<head>
  ...
  <script src=PATH_TO_FILE/sentimentVsScore.js></script>
  ...
<head>

You will also need to reference the style sheet provided using the line:
<head>
  ...
  <link rel="stylesheet" href="PATH_TO_FILE/css/barchart.css">
  ...
<head>

Lastly you will need to import the D3 library using the line:
<head>
  ...
  <script src="https://d3js.org/d3.v3.min.js"></script>
  ...
<head>

You then can make draw the graph using:
<script>
  ...
  var graph = new sentimentVsScoreGraph();
  graph.load();
  ...
</script>

All commands are shown together in the summative_bar_chart.html file.  Note, due to the sheer amount of data, it will take the the graph a couple of minutes to appear because of all of the data requested and processed from the web services.
