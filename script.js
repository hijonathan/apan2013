document.addEventListener('DOMContentLoaded', function() {
    var gData,
        URL = "0AsaxxHI5sR8FdFkxbmk4c2FibkZTWTlQTXlrRWJ4TlE";
    Tabletop.init( { key: URL, callback: init, simpleSheet: true } );
});

var width = document.width - 300,
    height = document.height,
    nodeRadius = 20,
    subNodeRadius = nodeRadius / 2,
    k = Math.sqrt(12 / (width * height));

var color = d3.scale.category20();

var force = d3.layout.force()
    .linkDistance(function(d) {
        if (d.type && d.type === 'property') {
            return 10;
        }
        else {
            return 100;
        }
    })
    .charge(-30 / k)
    .gravity(80 * k)
    .size([width, height]);

var svg = d3.select("#graph").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .attr("pointer-events", "all")
    .append('svg:g')
      .call(
            d3.behavior.zoom()
                .on("zoom", redraw)
                .translate([100,50]).scale(0.2)
      )
    .append('svg:g')
    .attr("transform","translate(100,50)scale(0.2,0.2)");

svg.append('svg:rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'white');

function redraw() {
  console.log("here", d3.event.translate, d3.event.scale);
  svg.attr("transform",
      "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

function init(data) {
    graphData(data);
    createSidebar(data);
}

function graphData(dataNodes) {
    _.each(dataNodes, function(n) {
        n.hobbies = [];
        var hobbieProps = ['hobby', 'hobby2', 'hobby3'];
        for (i=0; i<hobbieProps.length; i++) {
            var prop = hobbieProps[i];
            n.hobbies.push(n[prop]);
            delete n[prop];
        }

        n.id = n.rowNumber - 1;
        delete n['rowNumber'];

    });

    var people = _.map(dataNodes, function(n) {
        n.type = 'person';
        return n;
    });
    var nodes = people;

  // Break out property nodes
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

  force.nodes(nodes);

  // Dynamically build links based on shared attributes
  var links = [];
  var _nodes = nodes.slice();  // copy
  _.each(nodes, function(n, i) {
    if (n.type === "person") {
      _nodes.shift();
      var key,
          _k,
          t = i,
          matchKey,
          matchValue,
          shuffledKeys = _.shuffle(_.keys(n));
      for (_k=0; _k<shuffledKeys.length; _k++) {
        key = shuffledKeys[_k];
        if (key === 'type' || key === 'target') {
          continue;
        }
        var val = n[key];
        t = _.find(_nodes, function(_n) {
            var origProp = _n[key];
            if (_(origProp).isArray()) {
                return _.intersection(origProp, val).length;
            }
            else {
                return val !== '' && val !== '-' && origProp === val;
            }
        });
        if (t) {
          matchKey = key;

          if (_(val).isArray()) {
            matchValue = _.intersection(t[key], val)[0];
          }
          else {
            matchValue = val;
          }
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
            return Humanize.titlecase(d.matchKey) + ": " + d.matchValue;
          }
        });

  var node = svg.selectAll(".node")
      .data(nodes)
    .enter()
      .append('g')
      .attr('id', function(d) {
        return d.type + '-' + d.id;
      })
      .attr("class", function(d) {
        if (d.type && d.type === 'person') {
          return 'node person';
        }
        else {
          return 'node property';
        }
      });

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
          return '#eee';
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
          else {
            if (_(d.value).isArray()) {
                return d.value.join(', ');
            }
            else {
                return d.value;
            }
          }
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

  force.start();

    window.setTimeout(function() {
        if (force.alpha() < 0.01) {
            force.stop();
        }
    }, 2000);

}

function createSidebar(data) {
    var $list = $('#people');
    _.each(data, function(n) {
        $list.append("<li>" + n.name + "</li>");
    });

    $list.on('click', 'li a', function(e) {
        e.preventDefault();
        zoomTo(d3.select('#' + $(e.currentTarget).data('id')));
    });
}

function translateBetween(d) {
  var x1 = d.source.x;
  var y1 = d.source.y;
  var x2 = d.target.x;
  var y2 = d.target.y;
  return "translate(" + (x1 + x2) / 2 + "," + (y1 + y2) / 2 + ")";
}

function zoomTo(node) {
    // var zoomFactor = 4;
    // node.transition()
    //     .attr("fill", "red");

    // console.log(node, node.attr('transform'));
    // svg.select('g').transition()
    //     .attr("transform", "translate(" + node.attr('transform') + ")");
}