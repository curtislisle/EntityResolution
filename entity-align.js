/*jslint browser:true, unparam:true */
/*globals $, console, d3, tangelo */


var color = null;

var graph = null;
var svg = null;
var width = 0;
var height = 0;
var transition_time;
var translate = [0, 0];

var entityAlign = {};
entityAlign.force1 = null;
entityAlign.force2 = null;
entityAlign.host = null;
entityAlign.ac = null;
entityAlign.textmode = false;


//var LoggingLocation = "http://xd-draper.xdata.data-tactics-corp.com:1337"
var LoggingLocation = "http://10.1.90.46:1337/";
// testmode = false means logging is on
entityAlign.testMode = true;
entityAlign.echoLogsToConsole = false;
entityAlign.ac = new activityLogger().echo(entityAlign.echoLogsToConsole).testing(entityAlign.testMode);
ac = entityAlign.ac;
entityAlign.ac.registerActivityLogger(LoggingLocation, "Kitware_Entity_Alignment", "0.8");

entityAlign.dayColor = d3.scale.category10();
entityAlign.monthColor = d3.scale.category20();
entityAlign.dayName = d3.time.format("%a");
entityAlign.monthName = d3.time.format("%b");
entityAlign.dateformat = d3.time.format("%a %b %e, %Y (%H:%M:%S)");

// add globals for current collections to use.  Allows collection to be initialized at
// startup time from a defaults.json file.   A pointer to the global datastructures for each graph, are initialized empty as well.

entityAlign.graphsDatabase= null
entityAlign.showMatchesEnabled = false
entityAlign.graphA = null
entityAlign.graphB = null

// a backup copy of the files as read from the datastore is kept to send to the SGM algortihm.  The regular .graphA and .graphB entries 
// are operated-on by D3, so the datastructures don't work passed back to networkX directly anymore.  So a backup is kepts and this pristine
// copy is used to initialize the SGM algorithm executed as a tangelo service.

entityAlign.SavedGraphA = null
entityAlign.SavedGraphB = null

// there is a global array corresponding to the current matches known between the two loaded graphs.  The matches are an array of JSON objects, each with a 
// "ga" and "gb" attribute, whose corresponding values are integers that match the node IDs. 
entityAlign.currentMatches = []


entityAlign.monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
];

entityAlign.dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
];

// make alternating blue and tan colors gradually fading to background to add color gradient to network
// see http://en.wikipedia.org/wiki/Web_colors
entityAlign.nodeColorArray = [
        "#ff2f0e","#1f77b4","#cd853f","#1e90b4", "#f5deb3","#add8e6","#fff8dc",
        "#b0e0e6","#faf0e6","#e0ffff","#fff5e0","#f0fff0"
];



function stringifyDate(d) {
    "use strict";

    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function displayDate(d) {
    "use strict";

    return entityAlign.monthNames[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}



// This function is attached to the hover event for displayed d3 entities.  This means each rendered tweet has
// a logger installed so if a hover event occurs, a log of the user's visit to this entity is sent to the activity log

function loggedVisitToEntry(d) {
        //console.log("mouseover of entry for ",d.user)
        //entityAlign.ac.logUserActivity("hover over entity: "+d.tweet, "hover", entityAlign.ac.WF_EXPLORE);
     
}

function loggedDragVisitToEntry(d) {
        //console.log("mouseover of entry for ",d.user)
        //entityAlign.ac.logUserActivity("drag entity: "+d.tweet, "hover", entityAlign.ac.WF_EXPLORE);
}



function updateGraph1() {
    //updateGraph1_d3()
    initGraph1FromDatastore()

}


function updateGraph2() {
    initGraph2FromDatastore()
    // this rendering call below is the old style rendering, which doesn't update.  comment this out in favor of using
     updateGraph2_d3_afterLoad() 
    //updateGraph2_d3()
}

// define a key return function that makes sre nodes are matched up using their ID values.  Otherwise D3 might
// color the wrong nodes if the access order changes
function nodeKeyFunction(d) {
    return d.id
}


function updateGraph2_vega() {
    "use strict";
     //entityAlign.ac.logUserActivity("Update Rendering.", "render", entityAlign.ac.WF_SEARCH);
     entityAlign.ac.logSystemActivity('entityAlign - updateGraph 2 display executed');
    var center,
        data,
        end_date,
        hops,
        change_button,
        start_date,
        update;


    d3.select("#nodes2").selectAll("*").remove();
    d3.select("#links2").selectAll("*").remove();

    // Get the name of the graph dataset to render
    var graphPathname = d3.select("#graph2-selector").node();
    var selectedDataset = graphPathname.options[graphPathname.selectedIndex].text;

     var logText = "dataset2 select: start="+graphPathname;
     entityAlign.ac.logSystemActivity('Kitware entityAlign - '+logText);

    $.ajax({
        // generalized collection definition
        url: "service/loadgraph/" + entityAlign.host + "/"+ entityAlign.graphsDatabase + "/" + selectedDataset,
        data: data,
        dataType: "json",
        success: function (response) {
            var angle,
                enter,
                svg,
                svg2,
                link,
                map,
                newidx,
                node,
                tau;


            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned:',response.result)
            graph = {}
            graph.edges = response.result.links
            graph.nodes = response.result.nodes

            var width = 500
            var height = 500

            parseVegaSpec("#graph2","force.json",graph)
        }
         
    });
}

 // bind data  with the vega spec and render in the element passed as a parameter.  This routine reads the
 // vega spec and connects to dynamic data. It can be repeatedly called during execution to change the rendering
 // driven by vega

    function parseVegaSpec(element, spec, dynamicData) {
            console.log("parsing vega spec"); 
       vg.parse.spec(spec, function(chart) { 
            vegaview = chart({
                    el: element, 
                    data: {links: dynamicData.links, nodes: dynamicData.nodes}
                })
                .update()
                .on("mouseover", function(event, item) {
                        console.log('item',item.mark.marktype,' detected')
                        if (item.mark.marktype === 'symbol') {
                            vegaview.update({
                                props: 'hover0',
                                items: item.cousin(1)
                            });
                        } 
                })
                .on("mouseout", function(event, item) {
                        if (item.mark.marktype === 'symbol') {
                            vegaview.update({
                                props: 'update0',
                                items: item.cousin(1)
                            });
                        }
                 })
                 });
   }




function updateGraph1_d3() {
    "use strict";
     //entityAlign.ac.logUserActivity("Update Rendering.", "render", entityAlign.ac.WF_SEARCH);
     entityAlign.ac.logSystemActivity('entityAlign - updateGraph 1 display executed');
    var center,
        data,
        end_date,
        hops,
        change_button,
        start_date,
        update;


    d3.select("#nodes1").selectAll("*").remove();
    d3.select("#links1").selectAll("*").remove();

    // Get the name of the graph dataset to render
    var graphPathname = d3.select("#graph1-selector").node();
    var selectedDataset = graphPathname.options[graphPathname.selectedIndex].text;

     var logText = "dataset1 select: start="+graphPathname;
     entityAlign.ac.logSystemActivity('Kitware entityAlign - '+logText);

    $.ajax({
        // generalized collection definition
        url: "service/loadgraph/" + entityAlign.host + "/"+ entityAlign.graphsDatabase + "/" + selectedDataset,
        data: data,
        dataType: "json",
        success: function (response) {
            var angle,
                enter,
                svg,
                svg2,
                link,
                map,
                newidx,
                node,
                tau;


            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned:',response.result)
            graph = {}
            graph.edges = response.result.links
            graph.nodes = response.result.nodes

            transition_time = 600;


            // remove any previous graph
            $('#graph1-drawing-canvas').remove();

            svg = d3.select("#graph1").append('svg')
                .attr("id","graph1-drawing-canvas")
                .attr("width",800)
                .attr("height",800)


            link = svg.selectAll(".link")
                .data(graph.edges)
                .enter()
                .append("line")
                .classed("link", true)
                .style("stroke-width", 2.0);


            node = svg.selectAll(".node")
                .data(graph.nodes, function (d) { return d.name; })
                .on("mouseover", function(d) {
                        loggedVisitToEntry(d);
                });

            // support two different modes, where circular nodes are drawn for each entity or for where the
            // sender name is used inside a textbox. if entityAlign.textmode = true, then render text

            if (!entityAlign.textmode) {
                    enter = node.enter().append("circle")
                        .classed("node", true)
                        .attr("r", 5)
                        .style("opacity", 0.0)
                        .style("fill", "red")
                        .on("click", function(d) {
                            loggedVisitToEntry(d);
                            //centerOnClickedGraphNode(d.tweet);
                        });

                    enter.transition()
                        .duration(transition_time)
                        .attr("r", 12)
                        .style("opacity", 1.0)
                        .style("fill", function (d) {
                            return color(1);
                        });

                    enter.call(entityAlign.force2.drag)
                        .append("title")
                        //.call(entityAlign.force2.drag)
                        .text(function (d) {
                            var returntext = ""
                            for (var attrib in d) {
                                if (attrib != 'data') {
                                    returntext = returntext + attrib+":"+d[attrib]+"\n" 
                                }
                            }
                            return returntext;
                        })
                        .on("mouseover", function(d) {
                        loggedDragVisitToEntry(d);
                        });

                    node.exit()
                        .transition()
                        .duration(transition_time)
                        .style("opacity", 0.0)
                        .attr("r", 0.0)
                        .style("fill", "black")
                        .remove();

                    entityAlign.force1.nodes(graph.nodes)
                        .links(graph.edges)
                        .start();

                    entityAlign.force1.on("tick", function () {
                        link.attr("x1", function (d) { return d.source.x; })
                            .attr("y1", function (d) { return d.source.y; })
                            .attr("x2", function (d) { return d.target.x; })
                            .attr("y2", function (d) { return d.target.y; });

                        node.attr("cx", function (d) { return d.x; })
                            .attr("cy", function (d) { return d.y; });
                    });
            } else {

                enter = node.enter()
                    .append("g")
                    .classed("node", true);

                enter.append("text")
                    .text(function (d) {
                        return d.tweet;
                    })

                    // use the default cursor so the text doesn't look editable
                    .style('cursor', 'default')

                    // enable click to recenter
                    .on("click", function(d) {
                        loggedVisitToEntry(d);
                    })


                enter.insert("rect", ":first-child")
                    .attr("width", function (d) { return d.bbox.width + 4; })
                    .attr("height", function (d) { return d.bbox.height + 4; })
                    .attr("y", function (d) { return d.bbox.y - 2; })
                    .attr("x", function (d) { return d.bbox.x - 2; })
                    .attr('rx', 4)
                    .attr('ry', 4)
                    .style("stroke", function (d) {
                        return color(d.distance);
                    })
                    .style("stroke-width", "2px")
                    .style("fill", "#e5e5e5")
                    .style("fill-opacity", 0.8);

                entityAlign.force2.on("tick", function () {
                    link.attr("x1", function (d) { return d.source.x; })
                        .attr("y1", function (d) { return d.source.y; })
                        .attr("x2", function (d) { return d.target.x; })
                        .attr("y2", function (d) { return d.target.y; });

                    node.attr("transform", function (d) {
                        return "translate(" + d.x + ", " + d.y + ")";
                    });
                });
               entityAlign.force1.linkDistance(100);
            }
            entityAlign.force1.nodes(graph.nodes)
                .links(graph.edges)
                .start();

        
            enter.call(entityAlign.force1.drag);

            node.exit()
                .transition()
                .duration(transition_time)
                .style("opacity", 0.0)
                .attr("r", 0.0)
                .style("fill", "black")
                .remove();
        }
    });
}

// The InitGraph functions are called the first time a graph is loaded from the graph datastore.  The ajax call to load from the store
// is included here.  Globals variables are filled with the graph nodes and links.  No rendering is done in this method.  A method is 
// written for graph1 and graph2.  The only difference between the graph1 and graph2 methods is that they fill different global variables.

function   initGraph1FromDatastore()
{
 
  "use strict";
     //entityAlign.ac.logUserActivity("Update Rendering.", "render", entityAlign.ac.WF_SEARCH);
     entityAlign.ac.logSystemActivity('entityAlign - initialize graph A executed');
    var center,
        data,
        end_date,
        hops,
        change_button,
        start_date,
        update;


    d3.select("#nodes1").selectAll("*").remove();
    d3.select("#links1").selectAll("*").remove();

    // Get the name of the graph dataset to render
    var graphPathname = d3.select("#graph1-selector").node();
    var selectedDataset = graphPathname.options[graphPathname.selectedIndex].text;

     var logText = "dataset1 select: start="+graphPathname;
     entityAlign.ac.logSystemActivity('Kitware entityAlign - '+logText);

    $.ajax({
        // generalized collection definition
        url: "service/loadgraph/" + entityAlign.host + "/"+ entityAlign.graphsDatabase + "/" + selectedDataset,
        data: data,
        dataType: "json",
        success: function (response) {
            var angle,
                enter,
                svg,
                svg2,
                link,
                map,
                newidx,
                node,
                tau;


            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned:',response.result)
            entityAlign.graphA = {}
            entityAlign.graphA.edges = response.result.links
            entityAlign.graphA.nodes = response.result.nodes 

            // save a copy to send to the tangelo service. D3 will change the original around, so lets 
            // clone the object before it is changed
            entityAlign.SavedGraphA = {}
            entityAlign.SavedGraphA.edges   = jQuery.extend(true, {}, response.result.links);
            entityAlign.SavedGraphA.nodes = jQuery.extend(true, {}, response.result.nodes);

            updateGraph1_d3_afterLoad();
        }

    });
}


function   initGraph2FromDatastore()
{
 
  "use strict";
     //entityAlign.ac.logUserActivity("Update Rendering.", "render", entityAlign.ac.WF_SEARCH);
     entityAlign.ac.logSystemActivity('entityAlign - initialize graph A executed');
    var center,
        data,
        end_date,
        hops,
        change_button,
        start_date,
        update;


    d3.select("#nodes2").selectAll("*").remove();
    d3.select("#links2").selectAll("*").remove();

    // Get the name of the graph dataset to render
    var graphPathname = d3.select("#graph2-selector").node();
    var selectedDataset = graphPathname.options[graphPathname.selectedIndex].text;

     var logText = "dataset2 select: start="+graphPathname;
     entityAlign.ac.logSystemActivity('Kitware entityAlign - '+logText);

    $.ajax({
        // generalized collection definition
        url: "service/loadgraph/" + entityAlign.host + "/"+ entityAlign.graphsDatabase + "/" + selectedDataset,
        data: data,
        dataType: "json",
        success: function (response) {
            var angle,
                enter,
                svg,
                svg2,
                link,
                map,
                newidx,
                node,
                tau;


            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned:',response.result)

            // make a copy that will support the D3-based visualization
            entityAlign.graphB = {}
            entityAlign.graphB.edges = response.result.links
            entityAlign.graphB.nodes = response.result.nodes 

            // save a copy to send to the tangelo service. D3 will change the original around, so lets 
            // clone the object before it is changed
            entityAlign.SavedGraphB = {}
            entityAlign.SavedGraphB.edges   = jQuery.extend(true, {}, response.result.links);
            entityAlign.SavedGraphB.nodes = jQuery.extend(true, {}, response.result.nodes);
            updateGraph2_d3_afterLoad();
        }

    });
}

// The update_afterLoad routines are called whenever the graph should be visually refreshed from new state in the global variables:
// entityAlign.graphA and .graphB.   

function  updateGraph1_d3_afterLoad() {

    var enter;
    transition_time = 600;

            // remove any previous graph
            $('#graph1-drawing-canvas').remove();

            svg = d3.select("#graph1").append('svg')
                .attr("id","graph1-drawing-canvas")
                .attr("width",800)
                .attr("height",800)


            link = svg.selectAll(".link")
                .data(entityAlign.graphA.edges)
                .enter()
                .append("line")
                .classed("link", true)
                .style("stroke-width", 2.0);


            node = svg.selectAll(".node")
                .data(entityAlign.graphA.nodes, nodeKeyFunction)
                .on("mouseover", function(d) {
                        loggedVisitToEntry(d);
                });

            // support two different modes, where circular nodes are drawn for each entity or for where the
            // sender name is used inside a textbox. if entityAlign.textmode = true, then render text

            if (!entityAlign.textmode) {
                    enter = node.enter().append("circle")
                        .classed("node", true)
                        .attr("r", 5)
                        .style("opacity", 0.0)
                        .style("fill", "red")
                        .on("click", function(d) {
                            loggedVisitToEntry(d);
                            //centerOnClickedGraphNode(d.tweet);
                        })
                        // put a callback signal for entering and existing matched nodes, so we can highlight the 
                        // node in the opposite graph
                        .on("mouseenter", function(d) {
                            if ('matched' in d) {
                                console.log('enter hover of matched node')
                                highlightGraphBNode(d.matched)
                            }
                        });


                    enter.transition()
                        .duration(transition_time)
                        .attr("r", 12)
                        .style("opacity", 1.0)
                        .style("fill", 
                            function (d) {if ('matched' in d) {return "DarkRed"} else {return color(1)};}
                        );

                    enter.call(entityAlign.force1.drag)
                        .append("title")
                        .text(function (d) {
                            var returntext = ""
                            for (var attrib in d) {
                                // mask away the display of attributes not associated with the network.  Hide the D3 specific
                                // position and velocity stuff
                                if (!_.contains(['data','x','y','px','py'],attrib)) {
                                    returntext = returntext + attrib+":"+d[attrib]+"\n" 
                                }
                            }
                            return returntext;
                        })
                        .on("mouseover", function(d) {
                        loggedDragVisitToEntry(d);
                        });

                    // adjust the color according to the matched state. Make matched be dark red, otherwise pass the default color.
                    // should amend this to use the entity distance color, but the datasets don't currently 

                    node
                        .filter(function(d,i) { return d.id != 0})
                        .style("fill", function (d) {if ('matched' in d) {return "DarkRed"} else {return color(1)}});

                    node
                        .filter(function(d,i) { return d.id == 0})
                        .style("fill", "orange");

                    node.exit()
                        .transition()
                        .duration(transition_time)
                        .style("opacity", 0.0)
                        .attr("r", 0.0)
                        .style("fill", "black")
                        .remove();

                    entityAlign.force1.nodes(entityAlign.graphA.nodes)
                        .links(entityAlign.graphA.edges)
                        .start();

                    entityAlign.force1.on("tick", function () {
                        link.attr("x1", function (d) { return d.source.x; })
                            .attr("y1", function (d) { return d.source.y; })
                            .attr("x2", function (d) { return d.target.x; })
                            .attr("y2", function (d) { return d.target.y; });

                        node.attr("cx", function (d) { return d.x; })
                            .attr("cy", function (d) { return d.y; });
                    });
            } else {

                enter = node.enter()
                    .append("g")
                    .classed("node", true);

                enter.append("text")
                    .text(function (d) {
                        return d.tweet;
                    })

                    // use the default cursor so the text doesn't look editable
                    .style('cursor', 'default')

                    // enable click to recenter
                    .on("click", function(d) {
                        loggedVisitToEntry(d);
                    });


                enter.insert("rect", ":first-child")
                    .attr("width", function (d) { return d.bbox.width + 4; })
                    .attr("height", function (d) { return d.bbox.height + 4; })
                    .attr("y", function (d) { return d.bbox.y - 2; })
                    .attr("x", function (d) { return d.bbox.x - 2; })
                    .attr('rx', 4)
                    .attr('ry', 4)
                    .style("stroke", function (d) {
                        return color(d.distance);
                    })
                    .style("stroke-width", "2px")
                    .style("fill", "#e5e5e5")
                    .style("fill-opacity", 0.8);

                entityAlign.force1.on("tick", function () {
                    link.attr("x1", function (d) { return d.source.x; })
                        .attr("y1", function (d) { return d.source.y; })
                        .attr("x2", function (d) { return d.target.x; })
                        .attr("y2", function (d) { return d.target.y; });

                    node.attr("transform", function (d) {
                        return "translate(" + d.x + ", " + d.y + ")";
                    });
                });
               entityAlign.force1.linkDistance(100);
            }
            entityAlign.force1.nodes(entityAlign.graphA.nodes)
                .links(entityAlign.graphA.edges)
                .start();

        
            enter.call(entityAlign.force1.drag);

            node.exit()
                .transition()
                .duration(transition_time)
                .style("opacity", 0.0)
                .attr("r", 0.0)
                .style("fill", "black")
                .remove();
}


function  highlightGraphBNode(matched) {

}



// this is still not being called yet, because of the zoom/translate differences and missing nodes.  

function  updateGraph2_d3_afterLoad() {

    var enter;
    transition_time = 600;

            // remove any previous graph
            $('#graph2-drawing-canvas').remove();

            svg = d3.select("#graph2").append('svg')
                .attr("id","graph2-drawing-canvas")
                .attr("width",800)
                .attr("height",800)


            link = svg.selectAll(".link")
                .data(entityAlign.graphB.edges)
                .enter()
                .append("line")
                .classed("link", true)
                .style("stroke-width", 2.0);


            node = svg.selectAll(".node")
                .data(entityAlign.graphB.nodes, nodeKeyFunction)
                .on("mouseover", function(d) {
                        loggedVisitToEntry(d);
                });

            // support two different modes, where circular nodes are drawn for each entity or for where the
            // sender name is used inside a textbox. if entityAlign.textmode = true, then render text

            if (!entityAlign.textmode) {
                    enter = node.enter().append("circle")
                        .classed("node", true)
                        .attr("r", 5)
                        .style("opacity", 0.0)
                        .style("fill", "red")
                        .on("click", function(d) {
                            loggedVisitToEntry(d);
                            //centerOnClickedGraphNode(d.tweet);
                        })
                        .on("mouseenter", function(d) {
                            if ('matched' in d) {
                                console.log('enter hover of matched node')
                            }
                        });


                    enter.transition()
                        .duration(transition_time)
                        .attr("r", 12)
                        .style("opacity", 1.0)
                        .style("fill", 
                            function (d) {if ('matched' in d) {return "DarkRed"} else {return color(1)};}
                        );

                    enter.call(entityAlign.force2.drag)
                        .append("title")
                        .text(function (d) {
                            var returntext = ""
                            for (var attrib in d) {
                                // mask away the display of attributes not associated with the network.  Hide the D3 specific
                                // position and velocity stuff
                                if (!_.contains(['data','x','y','px','py'],attrib)) {
                                    returntext = returntext + attrib+":"+d[attrib]+"\n" 
                                }
                            }
                            return returntext;
                        })
                        .on("mouseover", function(d) {
                        loggedDragVisitToEntry(d);
                        });

                    // adjust the color according to the matched state. Make matched be dark red, otherwise pass the default color.
                    // should amend this to use the entity distance color, but the datasets don't currently 

                    //node.style("fill", function (d) {if (d.matched) {return "DarkRed"} else {return color(1)}});

                    node.style("fill", function (d) {if ('matched' in d) {return "DarkRed"} else {return color(1)}});

                    node.exit()
                        .transition()
                        .duration(transition_time)
                        .style("opacity", 0.0)
                        .attr("r", 0.0)
                        .style("fill", "black")
                        .remove();

                    entityAlign.force2.nodes(entityAlign.graphB.nodes)
                        .links(entityAlign.graphB.edges)
                        .start();

                    entityAlign.force2.on("tick", function () {
                        link.attr("x1", function (d) { return d.source.x; })
                            .attr("y1", function (d) { return d.source.y; })
                            .attr("x2", function (d) { return d.target.x; })
                            .attr("y2", function (d) { return d.target.y; });

                        node.attr("cx", function (d) { return d.x; })
                            .attr("cy", function (d) { return d.y; });
                    });
            } else {

                enter = node.enter()
                    .append("g")
                    .classed("node", true);

                enter.append("text")
                    .text(function (d) {
                        return d.tweet;
                    })

                    // use the default cursor so the text doesn't look editable
                    .style('cursor', 'default')

                    // enable click to recenter
                    .on("click", function(d) {
                        loggedVisitToEntry(d);
                    });


                enter.insert("rect", ":first-child")
                    .attr("width", function (d) { return d.bbox.width + 4; })
                    .attr("height", function (d) { return d.bbox.height + 4; })
                    .attr("y", function (d) { return d.bbox.y - 2; })
                    .attr("x", function (d) { return d.bbox.x - 2; })
                    .attr('rx', 4)
                    .attr('ry', 4)
                    .style("stroke", function (d) {
                        return color(d.distance);
                    })
                    .style("stroke-width", "2px")
                    .style("fill", "#e5e5e5")
                    .style("fill-opacity", 0.8);

                entityAlign.force2.on("tick", function () {
                    link.attr("x1", function (d) { return d.source.x; })
                        .attr("y1", function (d) { return d.source.y; })
                        .attr("x2", function (d) { return d.target.x; })
                        .attr("y2", function (d) { return d.target.y; });

                    node.attr("transform", function (d) {
                        return "translate(" + d.x + ", " + d.y + ")";
                    });
                });
               entityAlign.force2.linkDistance(100);
            }
            entityAlign.force2.nodes(entityAlign.graphB.nodes)
                .links(entityAlign.graphB.edges)
                .start();

        
            enter.call(entityAlign.force2.drag);

            node.exit()
                .transition()
                .duration(transition_time)
                .style("opacity", 0.0)
                .attr("r", 0.0)
                .style("fill", "black")
                .remove();
}


var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);


function updateGraph2_d3() {
    "use strict";
     //entityAlign.ac.logUserActivity("Update Rendering.", "render", entityAlign.ac.WF_SEARCH);
     entityAlign.ac.logSystemActivity('entityAlign - updateGraph 2 display executed');
    var center,
        data,
        end_date,
        hops,
        change_button,
        start_date,
        update;


    d3.select("#nodes2").selectAll("*").remove();
    d3.select("#links2").selectAll("*").remove();

    // Get the name of the graph dataset to render
    var graphPathname = d3.select("#graph2-selector").node();
    var selectedDataset = graphPathname.options[graphPathname.selectedIndex].text;

     var logText = "dataset2 select: start="+graphPathname;
     entityAlign.ac.logSystemActivity('Kitware entityAlign - '+logText);
     

    $.ajax({
        // generalized collection definition
        url: "service/loadgraph/" + entityAlign.host + "/"+ entityAlign.graphsDatabase + "/" + selectedDataset,
        data: data,
        dataType: "json",
        success: function (response) {
            var angle,
                enter,
                svg,
                svg2,
                link,
                map,
                newidx,
                node,
                tau;


            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned:',response.result)
            graph = {}
            graph.edges = response.result.links
            graph.nodes = response.result.nodes

            transition_time = 600;

            // remove any previous graph
            $('#graph2-drawing-canvas').remove();

            var margin = {top: -5, right: -5, bottom: -5, left: -5},
            width = 820 - margin.left - margin.right,
            height = 820 - margin.top - margin.bottom;

        // adding logic for dragging & zooming

        var zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 10])
            .on("zoom", zoomed);


        
        // added for drag & scale
        svg = d3.select("#graph2").append('svg')
            .attr("id","graph2-drawing-canvas")
            .attr("width",width + margin.left + margin.right)
            .attr("height",height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
            .call(zoom);

        var rect = svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all");

        var container = svg.append("g");

   //For zooming the graph #2
        function zoomed() {
          container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }

       
        // end of added for drag & scale

            link = container.selectAll(".link")
                .data(graph.edges)
                .enter()
                .append("line")
                .classed("link", true)
                .style("opacity",0.8)
                .style("color","red")
                .style("stroke-width", 2.0);



            node = container.selectAll(".node")
                .data(graph.nodes, function (d) { return d.name; })
                .on("mouseover", function(d) {
                        loggedVisitToEntry(d);
                });

            // support two different modes, where circular nodes are drawn for each entity or for where the
            // sender name is used inside a textbox. if entityAlign.textmode = true, then render text

            if (!entityAlign.textmode) {
                    enter = node.enter().append("circle")
                        .attr("r", 5)
                        .style("opacity", 0.0)
                        .style("fill", "orange")
                        .call(drag)
                        .on("click", function(d) {
                            loggedVisitToEntry(d);
                            //centerOnClickedGraphNode(d.tweet);
                        })


                    enter.transition()
                        .duration(transition_time)
                        .attr("r", 12)
                        .style("opacity", 1.0)
                        .style("fill", function (d) {
                            return color(2);
                        });

                    // add hover titles to the nodes.  the text is derived from the node attributes
                    enter.append("title")
                        //.call(entityAlign.force2.drag)
                        .text(function (d) {
                            var returntext = ""
                            // look through all the attributes in the node record and list them 
                            // in the textover field, except for the 'data' attribute, which is 
                            // currently a complex JSON object
                            for (var attrib in d) {
                                if (attrib != 'data') {
                                    returntext = returntext + attrib+":"+d[attrib]+"\n" 
                                }
                            }
                            return returntext;
                        })
                        .on("mouseover", function(d) {
                        loggedDragVisitToEntry(d);
                        });

                    node.exit()
                        .transition()
                        .duration(transition_time)
                        .style("opacity", 0.0)
                        .attr("r", 0.0)
                        .style("fill", "black")
                        .remove();

                    entityAlign.force2.nodes(graph.nodes)
                        .links(graph.edges)
                        .start();

                    entityAlign.force2.on("tick", function () {
                        link.attr("x1", function (d) { return d.source.x; })
                            .attr("y1", function (d) { return d.source.y; })
                            .attr("x2", function (d) { return d.target.x; })
                            .attr("y2", function (d) { return d.target.y; });

                        node.attr("cx", function (d) { return d.x; })
                            .attr("cy", function (d) { return d.y; });
                    });
            } else {

                enter = node.enter()
                    .append("g")
                    .classed("node", true)
                    .call(drag);

                enter.append("text")
                    .text(function (d) {
                        return d.tweet;
                    })

                    // use the default cursor so the text doesn't look editable
                    .style('cursor', 'default')

                    // enable click to recenter
                    .on("click", function(d) {
                        loggedVisitToEntry(d);
                    })


                enter.insert("rect", ":first-child")
                    .attr("width", function (d) { return d.bbox.width + 4; })
                    .attr("height", function (d) { return d.bbox.height + 4; })
                    .attr("y", function (d) { return d.bbox.y - 2; })
                    .attr("x", function (d) { return d.bbox.x - 2; })
                    .attr('rx', 4)
                    .attr('ry', 4)
                    .style("stroke", function (d) {
                        return color(d.distance);
                    })
                    .style("stroke-width", "2px")
                    .style("fill", "#e5e5e5")
                    .style("fill-opacity", 0.8);

                entityAlign.force2.on("tick", function () {
                    link.attr("x1", function (d) { return d.source.x; })
                        .attr("y1", function (d) { return d.source.y; })
                        .attr("x2", function (d) { return d.target.x; })
                        .attr("y2", function (d) { return d.target.y; });

                    node.attr("transform", function (d) {
                        return "translate(" + d.x + ", " + d.y + ")";
                    });
                });
               entityAlign.force2.linkDistance(100);
            }
            entityAlign.force2.nodes(graph.nodes)
                .links(graph.edges)
                .start();

        
            enter.call(entityAlign.force2.drag);

            node.exit()
                .transition()
                .duration(transition_time)
                .style("opacity", 0.0)
                .attr("r", 0.0)
                .style("fill", "black")
                .remove();
        }
    });
}

// These three routines below handle dragging events so dragging can take place of zooming

function dragstarted(d) {
  d3.event.sourceEvent.stopPropagation();
  console.log("drag start")
  d3.select(this).classed("dragging", true);
}

function dragged(d) {
  d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}

function dragended(d) {
  d3.select(this).classed("dragging", false);
}


function entityAlignDistanceFunction( distance) {
        // make alternating blue and tan colors gradually fading to background to add color gradient to network
        // see http://en.wikipedia.org/wiki/Web_colors

        // for really far away distances, wrap the colors, avoid the red at the center.  This allows this algorithm to always
        // produce a cycle of acceptable colors
        if (distance > entityAlign.nodeColorArray.length-1)
                return entityAlign.nodeColorArray[(distance%(entityAlign.nodeColorArray.length-1))+1];
         else
                return entityAlign.nodeColorArray[distance];
}


function processDefaultsFile(defaults) {

    d3.json(defaults, function (err, defaults) {
        defaults = defaults || {};

        // read default data collection names from config file
        entityAlign.host = defaults.mongoHost || "localhost";
        entityAlign.graphsDatabase = defaults.graphsDatabase || "year3_graphs"
        console.log('set graphs database: ',entityAlign.graphsDatabase)

        fillDatassetList('#graph1-selector')
        fillDatassetList('#graph2-selector')
        fillSeedList('#seed-selector')
    })

}



function firstTimeInitialize() {
    "use strict";

    // make the panel open & close over data content
    //$('#control-panel').controlPanel();

    processDefaultsFile("defaults.json")

    width = $(window).width();
    height = $(window).height();

    // 3/2014: changed link strength down from charge(-500), link(100) to charge(-2000)
    // to reduce the node overlap but still allow some node wandering animation without being too stiff

    entityAlign.force1 = d3.layout.force()
        .charge(-200)
        .linkDistance(75)
        .gravity(0.2)
        .friction(0.6)
        .size([width/3, height/2]);

    entityAlign.force2 = d3.layout.force()
        .charge(-200)
        .linkDistance(75)
        .gravity(0.2)
        .friction(0.6)
        .size([width/3, height/2]);

    color = d3.scale.category20();
    //color = entityAlignDistanceFunction;

    // set a watcher on the dataset selector so datasets are filled in
    // automatically when the user selects it via UI selector elements. 

    d3.select("#graph1-selector")
        .on("change", updateGraph1);
    d3.select("#graph2-selector")
        .on("change", updateGraph2);
    d3.select('#change-seeds')
        .on("click", loadNewSeeds);
    d3.select("#align-button")
        .on("click", runSeededGraphMatching);
    d3.select("#top-k-button")
        .on("click", runAlphaSpokeMatching);
    d3.select("#show-matches-toggle")
        .attr("disabled", true)
        .on("click",  function () { entityAlign.showMatchesEnabled = !entityAlign.showMatchesEnabled; 
                                    conole.log(entityAlign.showMatchesEnabled);
                                   });

    // block the contextmenu from coming up (often attached to right clicks). Since many 
    // of the right clicks will be on the graph, this has to be at the document level so newly
    // added graph nodes are all covered by this handler.

    $(document).bind('contextmenu', function(e){
        e.preventDefault();
        return false;
        });
}


// *** initialization.  What do we do the first time the app is opened and the document is ready?

window.onload = function ()  {

        firstTimeInitialize();    // Fill out the dataset selectors with graph datasets that we can choose from  
};


// use a python service to search the datastore and return a list of available networks to pick from.  This fills a GUI selector, so the user
// can see what datasets are available.

function fillDatassetList(element) {
  d3.select(element).selectAll("a").remove();
        d3.json("service/listdatasets/"+ entityAlign.host + "/" + entityAlign.graphsDatabase, function (error, entities) {
            console.log(entities,"\n");
            // save in a temporary list so we can refer back during a click event
            d3.select(element).selectAll("option")
            .data(entities.result)
            .enter().append("option")
            .text(function (d) { return d; });
        });
}

// use a python service to search the datastore and return a list of available seed arrays to pick from.  This fills a GUI selector, so the user
// can see what datasets are available.

function fillSeedList(element) {
  d3.select(element).selectAll("a").remove();
        d3.json("service/listseeds/"+ entityAlign.host + "/" + entityAlign.graphsDatabase, function (error, entities) {
            console.log(entities,"\n");
            // save in a temporary list so we can refer back during a click event
            d3.select(element).selectAll("option")
            .data(entities.result)
            .enter().append("option")
            .text(function (d) { return d; });
        });

}


// change the stagus of the global show matches 
function toggleShowMatches() {

}

// restore the graph to a state where there are no matches recorded for any nodes by deleting the matched properties on all nodes in the graphs.

function removeMatchingRecordsFromGraphs() {
    console.log('graphA:',entityAlign.graphA)
    for (node in entityAlign.graphA.nodes) {
        if (node.hasOwnProperty('matched')) {
            delete node.matched
        }
    }
    console.log('graphA after:',entityAlign.graphA)
    // repeat for graphB
    for (node in entityAlign.graphB.nodes) {
        if (node.matched != 'undefined') {
            delete node.matched
        }
    }
}

// this routine reads the dataset pointed to by the seed selector and reads the seeds out of the dataset using the "loadseeds" python service.  The seeds
// come across as an array of JSON objects.   It is assumed the seed objects have a "ga" and "gb" component. Once the data is read, it is loaded into a 
// currentMatches array, which may be augmented by the graph matching algorithm later.  The seeds function as the initial values in the matching array. 

function loadNewSeeds() {
    console.log("loading seeds");
    // re-initialize the matches to an empty set
    entityAlign.currentMatches = []
    removeMatchingRecordsFromGraphs()
    var pathname = d3.select("#seed-selector").node();
    var selectedDataset = pathname.options[pathname.selectedIndex].text;

     var logText = "seed select: "+pathname;
     entityAlign.ac.logSystemActivity('Kitware entityAlign - '+logText);

    $.ajax({
        // generalized collection definition
        url: "service/loadseeds/" + entityAlign.host + "/"+ entityAlign.graphsDatabase + "/" + selectedDataset,
        dataType: "json",
        success: function (response) {

            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned: from seeds',response.result)
            for (seed in response.result.seeds) {
                //console.log( response.result.seeds[seed])
                entityAlign.currentMatches.push(response.result.seeds[seed])
            }
            // set the attributes in the graph nodes so color can show existing matches
            updateMatchingStatusInGraphs()
            updateGraph2_d3_afterLoad()
            // allow time for the layout of the first graph before doing the layout on the second.  This won't scale for large graphs,
            // but it works for our simple testcases.  
            setTimeout(function(){
                updateGraph1_d3_afterLoad()
            },1250);
            // this is turned off until we figure out why rendering graph2 confuses the layout of graph1

 
        }

    })
}

// this function is called after a new set of seeds are loaded.  Assuming there are graphs present, we traverse through the graphs and set
// the "matched" attribute to have the ID of the node in the opposing graph, which matches it. 

function updateMatchingStatusInGraphs() {
    clearMatchedStatusForGraph(entityAlign.graphA)
    clearMatchedStatusForGraph(entityAlign.graphB)
    for (match in  entityAlign.currentMatches) {
        // set matched attributes
        var match_record = entityAlign.currentMatches[match]
        //console.log('match',match,'match_record',match_record)
        var ga_index = match_record.ga
        var gb_index = match_record.gb
        //console.log('match',match,'ga',ga_index)
        var ga_node = entityAlign.graphA.nodes[ga_index]
        var gb_node = entityAlign.graphB.nodes[gb_index]
        ga_node.matched = match_record.gb
        gb_node.matched = match_record.ga
    }
}


function clearMatchedStatusForGraph(graph) {

}


function runSeededGraphMatching() {
    console.log("do graph matching")
    console.log(entityAlign.graphB,entityAlign.graphA)
    $.ajax({
        type: 'PUT',
        // generalized collection definition
        url: "service/jhu_seeded_graph_matching" ,
        // + "/" + entityAlign.currentMatches
        data: {
            graphAnodes: JSON.stringify(entityAlign.SavedGraphA.nodes),
            graphAedges: JSON.stringify(entityAlign.SavedGraphA.edges),    
            graphBnodes: JSON.stringify(entityAlign.SavedGraphB.nodes),         
            graphBedges: JSON.stringify(entityAlign.SavedGraphB.edges),
            seeds: JSON.stringify(entityAlign.currentMatches)
        },
        dataType: "json",
        success: function (response) {

            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned: from SGM',response.result)
            entityAlign.currentMatches = []
            for (match in response.result.matches) {
                //console.log( response.result.seeds[seed])
                entityAlign.currentMatches.push(response.result.matches[match])
            }
            // set the attributes in the graph nodes so color can show existing matches
            updateMatchingStatusInGraphs()
            updateGraph2_d3_afterLoad()
            // allow time for the layout of the first graph before doing the layout on the second.  This won't scale for large graphs,
            // but it works for our simple testcases.       
            setTimeout(function(){
                updateGraph1_d3_afterLoad()
            },1250);
        }

    })
}
function runAlphaSpokeMatching() {
    var alphavalue = document.getElementById('alpha-value').value;
    var restartsvalue = document.getElementById('restarts-value').value;
    console.log('Found a user inputed alpha: ', alphavalue)
    console.log('Found a user inputed number of restarts: ', restartsvalue)
    console.log("do alpha-spoke matching")
    console.log(entityAlign.graphB,entityAlign.graphA)
    $.ajax({
        type: 'PUT',
        // generalized collection definition
        url: "service/jhu_alpha_spoke_matching" ,
        // + "/" + entityAlign.currentMatches
        data: {
            graphAnodes: JSON.stringify(entityAlign.SavedGraphA.nodes),
            graphAedges: JSON.stringify(entityAlign.SavedGraphA.edges),    
            graphBnodes: JSON.stringify(entityAlign.SavedGraphB.nodes),         
            graphBedges: JSON.stringify(entityAlign.SavedGraphB.edges),
            seeds: JSON.stringify(entityAlign.currentMatches),
            alpha: alphavalue,
            num_restarts: restartsvalue
        },
        dataType: "json",
        success: function (response) {

            if (response.error ) {
                console.log("error: " + response.error);
                return;
            }
            console.log('data returned: from SGM',response.result)
        // Need to do something different with the matching result
            entityAlign.currentMatches = []
            for (match in response.result.matches) {
                //console.log( response.result.seeds[seed])
                //entityAlign.currentMatches.push(response.result.matches[match])
            }
            // set the attributes in the graph nodes so color can show existing matches
            updateMatchingStatusInGraphs()
            updateGraph2_d3_afterLoad()
            // allow time for the layout of the first graph before doing the layout on the second.  This won't scale for large graphs,
            // but it works for our simple testcases.       
            setTimeout(function(){
                updateGraph1_d3_afterLoad()
            },1250);
        }

    })
}
