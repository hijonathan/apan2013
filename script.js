var width = 960,
    height = 500,
    nodeRadius = 20,
    k = Math.sqrt(12 / (width * height));

var color = d3.scale.category20();

var force = d3.layout.force()
    .linkDistance(200)
    .charge(-10 / k)
    .gravity(100 * k)
    .size([width, height]);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.json("categories.json", function(error, graph) {
  force.nodes(graph.nodes);

  // Dynamically build links based on shared attributes
  var links = [];
  var _nodes = graph.nodes.slice();  // copy
  _.each(graph.nodes, function(n, i) {
    _nodes.shift();
    var t = i,
        matchKey,
        matchValue;
    for (var key in n) {
      var val = n[key];
      t = _.find(_nodes, function(_n) {
        return _n[key] === val;
      });
      if (t) {
        matchKey = key;
        matchValue = val;
        break;
      }
    }

    if (t) {
      links.push(_.extend({
        source: i,
        target: (t && t.id) || i,
        matchKey: matchKey,
        matchValue: matchValue
      }, {props: t}));
    }

  });

  force.links(links);
  force.start();

  var link = svg.selectAll(".link")
      .data(links)
    .enter().append("g")
      .attr("class", "link");

  var line = link.append('line')
    .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var matchCirlce = link.append('circle')
      .attr('r', nodeRadius / 2)
      .style('fill', '#eee');

  var text = link.append("text")
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(function(d) { return d.matchValue; });

  var node = svg.selectAll(".node")
      .data(graph.nodes)
    .enter()
      .append('g')
      .attr("class", "node")
      .call(force.drag);

  var circle = node.append("circle")
      .attr("r", nodeRadius)
      .style("fill", function(d) { return color(d.id); });

  node.append("text")
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(function(d) { return d.name; });

  force.on("tick", function() {

    node.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });


    line.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    text.attr("transform", translateBetween);
    matchCirlce.attr("transform", translateBetween);

  });
});

function translateBetween(d) {
  var x1 = d.source.x;
  var y1 = d.source.y;
  var x2 = d.target.x;
  var y2 = d.target.y;
  return "translate(" + (x1 + x2) / 2 + "," + (y1 + y2) / 2 + ")";
}
