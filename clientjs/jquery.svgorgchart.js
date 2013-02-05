/* http://keith-wood.name/svg.html
   SVG orgchart for jQuery v1.4.5.
   Written by Keith Wood (kbwood{at}iinet.com.au) August 2007.
   Dual licensed under the GPL (http://dev.jquery.com/browser/trunk/jquery/GPL-LICENSE.txt) and
   MIT (http://dev.jquery.com/browser/trunk/jquery/MIT-LICENSE.txt) licenses.
   Please attribute the author if you use it. */

function indexOf (arr, elt /*, from*/) {
    var len = arr.length >>> 0;

    var from = Number(arguments[2]) || 0;
    from = (from < 0) ? Math.ceil(from) : Math.floor(from);

    if (from < 0)
        from += len;

    for (; from < len; from++) {
        if (from in arr && arr[from] === elt)
            return from;
    }
    return -1;
}

function logChart(chart) {
    for (var cy in chart.map) {
        var lstr = '';
        for (var cx in chart.map[cy]) {
            lstr += chart.map[cy][cx] ? 'X' : ' ';
        }
        console.log(lstr);
        lstr = '';
        if (cy in chart.lines) {
            for (var lx in chart.lines[cy]) {
                lstr += chart.lines[cy][lx] ? '-' : ' ';
            }
            console.log(lstr);
        }
    }
}

(function($) { // Hide scope, no $ conflict

    function SVGOrgChart() {
    }

    $.extend(SVGOrgChart.prototype, {

        /* Retrieve the display title for this chart type.
           @return  the title */
        title: function() {
            return 'Org Chart';
        },

        /* Retrieve a description of this chart type.
           @return  its description */
        description: function() {
            return 'Display employees of an organization in a flow-type display.';
        },

        /* Retrieve a list of the options that may be set for this chart type.
           @return  options list */
        options: function() {
            return ['padding (number) - pixels of padding between units',
                    'size (number) - size of each node in pixels',
                    'orig (element) - the <li> or <ul> holding the original data',
                    'draw (function) - a function called to draw the data inside the node, taking an SVG group and the original node as arguments'];
        },

        /* Actually draw the graph in this type's style.
           @param  graph  (object) the SVGGraph object */
        drawGraph: function(graph) {
            var padding = graph._chartOptions.padding - 0 || 10;
            var orig = graph._chartOptions.orig || null;
            var size = graph._chartOptions.size - 0 || 100;
            var height = graph._chartOptions.height - 0 || 75;
            var draw = graph._chartOptions.draw || function () {};
			var drawGroup = graph._chartOptions.drawGroup || function () {};
            var clickevent = graph._chartOptions.click || function () {};
            var cb = graph._chartOptions.cb || function () {};
            var sw = graph._chartOptions.sideways || false;
            this._chart = graph._wrapper.group(graph._chartCont, {class_: 'chart'});
            this._drawChart(graph, size, height, padding, orig, draw, drawGroup, clickevent, sw, cb);
            graph._drawTitle();
        },

        /* Plot a chart */
        _drawChart: function(graph, size, height, padding, orig, format, formatGroup, clickevent, sw, cb) {
            if (orig !== null) {
                var w = graph._wrapper;
                var d = w.defs(this._chart);
                w.rect(d, 0, 0, size, height, 5, 5, {fill:'white', stroke: '#969898', strokeWidth: 2, id: 'outlinerect'});
				w.polygon( d, [[size / 2, 0], [size, height / 3], [0, height / 3]],
						{ fill: 'blue', id: 'order-change-up' } );
				w.polygon( d, [[0, 0], [size, 0], [size / 2, height / 3]],
						{ fill: 'blue', id: 'order-change-down' } );
                var g = w.group(this._chart,
                                $.extend({class_: 'graph', fill: graph._fill, stroke: graph._stroke,
                                          transform: 'translate(0 20)', strokeWidth: graph._strokeWidth}, graph._settings || {}));

                if (orig.is('ul')) {
                    orig = $('li:first', orig);
                }

                this._drawNode(w, g, orig, size, height, padding, format, formatGroup, clickevent, sw, cb, 2, 0);
            }
        },

        /* Draw a node, and all of its children, and return it */
        _drawNode: function(w, parent, $node, size, height, padding, format, formatGroup, click, sw, cb, isone, level, fns) {
            var _options = w.graph._chartOptions;
            var isFirstCall = level === 0;
            function addToWidth(amt) {
                addToDims(sw ? 'height' : 'width', amt);
            }
            function addToHeight(amt) {
                addToDims(sw ? 'width' : 'height', amt);
            }
            function addToDims(which, amt) {
                var $cont = $(w._container);
                var $svg = $(w._svg);
                var $graph = $(w.graph._chartCont);
                var newwidth = ($cont.attr(which) - 0) + amt;
                $cont.attr(which, newwidth);
                $svg.attr(which, newwidth);
                $graph.attr(which, newwidth);
            }
            function setDims(which, amt) {
                var $cont = $(w._container);
                var $svg = $(w._svg);
                var $graph = $(w.graph._chartCont);
                $cont.attr(which, amt);
                $svg.attr(which, amt);
                $graph.attr(which, amt);
            }

            var sizeOrHeight = sw ? height : size;
            var heightOrSize = sw ? size : height;

            if (!fns || fns === null || typeof fns.dn != 'function') {
                fns = {};
                if (this && this._drawNode) {
                    fns.dn = this._drawNode;
                    fns.fbo = this._findBestOffset;
                    fns.mm = this._mergeMaps;
                    fns.cfc = this._checkForConflicts;
                } else {
                    var f = function () {};
                    fns.dn = f;
                    fns.fbo = f;
                    fns.mm = f;
                    fns.cfc = f;
                }
            }

            var chart = {size: 0, map: [[]]};

            if (!isone) {
                addToWidth(sizeOrHeight + padding);
            }
            addToHeight(heightOrSize + padding * 2);

            var $childNodes = $node.children("ul:first").children("li");
            var tg = w.group(parent, {});
            var nodeg = w.group(tg, {});
            var $nodeContent = $node.clone()
                .children("ul,li")
                .remove()
                .end();
            var result = format(w, nodeg, $node, level);
            chart.map[0].push(1);
            chart.parentid = nodeg.id;
            chart.csize = 2;
            chart.off = 0;
            chart.lines = [[]];
            var locdown = (heightOrSize + 2 * padding);
            var tlcorner = 0;
            var shouldContinue = (isFirstCall || !_options || !_options.maxDepth || level < _options.maxDepth - 1);
            if ($childNodes && $childNodes.length && shouldContinue) {
                var childlocs = {};
                var childcount = 0;
                var children = w.group(tg, {transform: (sw ? 'translate(' : 'translate(0 ') + locdown + (sw ? ' 0)' : ')')});
				formatGroup( w, children, level + 1 );
                chart.map.push([]);
                var charts = [];
                var lastborder = 0;
                $childNodes.each((function (tchart) {
                    return function (ix) {
                        var $this = $(this);
                        var shouldRender = !_options.shouldRender || _options.shouldRender($this);
                        if (shouldRender) {
                            var nrg = w.group(children, {});
                            var rchart = fns.dn(w, nrg, $this, size, height, padding, format, formatGroup, click, sw, cb, (ix == 0), level + 1, fns);

                            var tsize = rchart.size;

                            rchart.off = fns.fbo(tchart, rchart, 1, fns.cfc);
                            fns.mm(tchart, rchart, [rchart.off, 1]);
                            var haveFoundOne = false;
                            for (var nox in tchart.map[1]) {
                                nox = nox - 0;
                                if (haveFoundOne && indexOf(tchart.map[1], 1, nox-1) == -1) {
                                    break;
                                }
                                haveFoundOne = haveFoundOne || tchart.map[1][nox]
                                tchart.lines[0][nox] = haveFoundOne * 1;
                            }
                            for (var rcly in rchart.lines) {
                                rcly = rcly - 0;
                                while (tchart.lines.length <= rcly + 1) {
                                    tchart.lines.push([]);
                                }
                                for (var rclx in rchart.lines[rcly]) {
                                    rclx = rclx - 0;
                                    while (rclx + rchart.off >= tchart.lines[rcly+1].length) {
                                        tchart.lines[rcly+1].push(0);
                                    }
                                    tchart.lines[rcly+1][rclx+rchart.off] = rchart.lines[rcly][rclx];
                                }
                            }

                            var wind = tchart.csize;
                            var tloc = (rchart.off/2 * (sizeOrHeight + padding));
                            var added = tchart.added;
                            tchart.added = 0;

                            w.change(nrg, {transform: (sw ? 'translate(0 ' : 'translate(') + tloc + (sw ? ')' : ' 0)')});
                            var cwidth = (((added) * (sizeOrHeight + padding)) - padding) / 2;
                            childlocs[rchart.parentid] = tloc + (rchart.csize / 4) * (sizeOrHeight + padding) - (padding / 2);
                            childcount += 1;
                            tchart.size += cwidth;
                            tchart.csize += added;
                        }
                    };
                })(chart));

                var childsize = (chart.csize / 2) - 1;
                tlcorner = ((sizeOrHeight + padding) * childsize / 2);
                while (childsize > 0) {
                    chart.map[0].unshift(0);
                    childsize -= 1;
                }
                if (tlcorner != 0) {
                    w.change(nodeg, {transform: (sw ? 'translate(0 ' : 'translate(') + tlcorner + (sw ? ')' : ' 0)')});
                }
            }

            if (isFirstCall) {
                logChart(chart);
                w.change(tg, {transform: 'translate(' + (padding / 2) + ' ' + (padding / 2) + ')'});
                setDims(sw ? 'height' : 'width', (chart.csize / 2) * (sizeOrHeight + padding) + padding);
                setDims(sw ? 'width' : 'height', (chart.map.length) * (heightOrSize + 2 * padding) + padding);
            }

            var botcenter = [(tlcorner + (size / 2)), height];
            if (sw) {
                botcenter = [size, tlcorner + height / 2];
            }
            var justbelow = [botcenter[0], botcenter[1] + padding];
            if (sw) {
                justbelow = [botcenter[0] + padding, botcenter[1]];
            }

            var lineg = w.group(tg, 'lines-from-'+chart.parentid, {});
            for (var cx in childlocs) {
                var clineg = w.group(lineg, 'lines-to-'+cx, {fill: 'none', stroke: 'black', strokeWidth: '1'});
                var cl = childlocs[cx];
                var topcenter = [cl, height + padding * 2];
                if (sw) {
                    topcenter = [size + padding * 2, cl];
                }
                var justabove = [topcenter[0], topcenter[1] - padding];
                if (sw) {
                    justabove = [topcenter[0] - padding, topcenter[1]];
                }
                w.polyline(clineg, [botcenter, justbelow, justabove, topcenter], {});
            }

            nodeg.onclick = function (event) {
                var id = nodeg.id || null;
                click(nodeg, id, w);
            };

            cb(nodeg, nodeg.id);
            if (sizeOrHeight > chart.size) {
                chart.size = sizeOrHeight;
            }
            return chart;
        },

        _checkForConflicts: function (ochart, rchart, offset) {
            var chart = ochart.map;
            var newobj = rchart.map;
            var x = offset[0] - 0;
            var y = offset[1] - 0;
            if (!ochart.added) {
                ochart.added = 0;
            }
            var brix = 0;

            for (var cx in chart) {
                if (chart[cx].length > chart[brix].length) {
                    brix = cx;
                }
            }

            var lines = ochart.lines;
            var nlines = rchart.lines;
            for (var ly in nlines) {
                ly = ly - 0;
                if (lines.length <= ly + y) {
                    break;
                }
                var lrow = lines[ly + y];
                for (var lx in nlines[ly]) {
                    lx = lx - 0;
                    if (lrow.length <= lx + x) {
                        break;
                    }
                    if (nlines[ly][lx] == 1 && lrow[lx + x] == 1) {
                        return false;
                    }
                }
            }

            for (var ny in newobj) {
                ny = ny - 0;
                while (chart.length <= ny + y) {
                    chart.push([]);
                }
                var trow = chart[ny + y];
                for (var nx in newobj[ny]) {
                    nx = nx - 0;
                    while (trow.length <= nx + x) {
                        trow.push(0);
                        if (brix == ny+y || chart[ny+y].length > chart[brix].length) {
                            brix = ny+y;
                            ochart.added += 1;
                        }
                    }
                    var tcol = trow[nx + x];
                    var lcol = 0;
                    var rcol = 0;
                    if (nx + x > 0) {
                        lcol = trow[nx + x - 1];
                    }
                    if (nx + x < trow.length - 1) {
                        rcol = trow[nx + x + 1];
                    }
                    if (newobj[ny][nx] == 1) {
                        if (tcol == 1 || lcol == 1 || rcol == 1) {
                            return false;
                        }
                    }
                }
            }
            return true;
        },

        _findBestOffset: function (chart, newobj, yoff, cfc) {
            var offset = chart.csize - 2;
            var boffset = offset;
            while (offset > 0 && !cfc(chart, newobj, [offset, yoff])) {
                offset -= 1;
            }
            while (!cfc(chart, newobj, [offset, yoff])) {
                if (offset == 0) offset = boffset;
                offset += 1;
            }
            return offset;
        },

        _mergeMaps: function (ochart, rchart, offset) {
            var chart = ochart.map;
            var newobj = rchart.map;
            var x = offset[0] - 0;
            var y = offset[1] - 0;

            var newlines = rchart.lines;
            for (var ly in newlines) {
                ly = ly - 0;
                while (ochart.lines.length <= ly + y) {
                    ochart.lines.push([]);
                }
                for (var lx in newlines[ly]) {
                    lx = lx - 0;
                    while (lx + x >= ochart.lines[ly+y].length) {
                        ochart.lines[ly+y].push(0);
                    }
                    ochart.lines[ly+y][lx + x] = newlines[ly][lx];
                }
            }

            if (!ochart.added) {
                ochart.added = 0;
            }
            var brix = 0;

            for (var cx in chart) {
                if (chart[cx].length > chart[brix].length) {
                    brix = cx;
                }
            }

            ochart.newpix = 0;
            while (newobj[0][ochart.newpix] != 1) {
                ochart.newpix += 1;
            }

            for (var ny in newobj) {
                ny = ny - 0;
                while (chart.length <= ny+y) {
                    chart.push([]);
                }
                for (var nx in newobj[ny]) {
                    nx = nx - 0;
                    while (chart[ny+y].length <= nx+x) {
                        chart[ny+y].push(0);
                        if (brix == ny+y || chart[ny+y].length > chart[brix].length) {
                            brix = ny+y;
                            ochart.added += 1;
                        }
                    }
                    if (newobj[ny][nx] == 1) {
                        chart[ny+y][nx+x] = 1;
                    }
                }
            }
        }
    });
    $.svg.graphing.addChartType('orgchart', new SVGOrgChart());
})(jQuery)
