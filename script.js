var width = document.width,
    height = document.height,
    nodeRadius = 20,
    subNodeRadius = nodeRadius / 2,
    k = Math.sqrt(12 / (width * height));

var color = d3.scale.category20();

var force = d3.layout.force()
    .linkDistance(200)
    .charge(-10 / k)
    .gravity(100 * k)
    .size([width, height]);

var svg = d3.select("body").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .attr("pointer-events", "all")
    .append('svg:g')
      .call(d3.behavior.zoom().on("zoom", redraw))
    .append('svg:g');

svg.append('svg:rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'white');

function redraw() {
  console.log("here", d3.event.translate, d3.event.scale);
  svg.attr("transform",
      "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

d3.json("categories.json", function(error, graph) {
  // Break out property nodes
  var people = _.where(graph.nodes, {type: 'person'}),
      nodes = people;

  _.each(people, function(p) {
    _.each(p, function(prop, _k) {
      if (_k !== 'name' && _k !== 'Name' && _k !== 'id' && _k !== 'type') {
        nodes.push({
          target: p.id,
          type: 'property',
          name: _k,
          value: prop
        });
      }
    });
  });

  debugger
  force.nodes(nodes);

  // Dynamically build links based on shared attributes
  var links = [];
  var _nodes = nodes.slice();  // copy
  _.each(nodes, function(n, i) {
    if (n.type === "person") {
      _nodes.shift();
      var t = i,
          matchKey,
          matchValue;
      for (var key in n) {
        if (key === 'type' || key === 'target') {
          continue;
        }
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
        var uniqT = _.clone(t);
        delete uniqT[matchKey];
        delete uniqT.name;
        delete uniqT['Name'];

        links.push(_.extend({
          source: i,
          target: (t && t.id) || i,
          matchKey: matchKey,
          matchValue: matchValue
        }, {props: uniqT}));
      }
    }
    else {
      links.push(_.extend(n, {
        source: i
      }));
    }

  });

  force.links(links);
  force.start();

  var link = svg.selectAll(".link")
      .data(links)
    .enter().append("g")
      .attr('class', function(d) {
        if (d.props) {
          return 'person link';
        }
        else return 'property link';
      });

  var line = link.append('line')
      .style("stroke-width", 1);

  var matchCirlce = svg.selectAll('.link.person')
      .append('circle')
        .attr('r', subNodeRadius)
        .style('fill', '#eee');

  var text = svg.selectAll('.link.person')
      .append("text")
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .text(function(d) {
          if (d.matchValue === true || d.matchValue === false) {
            return d.matchKey;
          }
          else {
            return d.matchKey+ ": " + d.matchValue;
          }
        });

  var node = svg.selectAll(".node")
      .data(nodes)
    .enter()
      .append('g')
      .attr("class", function(d) {
        if (d.type && d.type === 'person') {
          return 'node person'
        }
        else {
          return 'node property';
        }
      })
      .call(force.drag);

  var circle = node.append("circle")
      .attr("r", function(d) {
        if (d.type && d.type === 'person') {
          return nodeRadius;
        }
        else {
          return subNodeRadius;
        }
      })
      .style('fill', function(d) {
        if (d.type && d.type === 'person') {
          return color(d.id);
        }
        else {
          return '#eee'
        }
      });

  node.append("text")
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(function(d) {
        if (d.type && d.type === 'person') {
          return d.name;
        }
        else {
          if (d.value === true || d.value === false) {
            return d.name;
          }
          else return d.value;
        }
      });

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
