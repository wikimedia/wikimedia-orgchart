function orgChart() {
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $dlist = $('#of-documents-list');
    var $doctpl = $('.of-doc-box').detach();
    var $docctpl = $('.of-doc-create').detach();
    var session = {};
    var $units = $('#of-org-form');
    var units = {};
    var locs = {};
    var loccodes = {};

    function setLocation(wholeLocation) {
        if (!wholeLocation || wholeLocation.length == 0) {
            document.location.hash = '';
            loadDocs();
        } else {
            document.location.hash = wholeLocation.join('/');
            if (wholeLocation.length == 1) {
                loadDoc(wholeLocation[0]);
            } else {
                loadDoc(wholeLocation[0], wholeLocation[1]);
            }
        }
    }

    function getLocation() {
        var hash = document.location.hash.slice(1);
        return hash.split('/');
    }

    function getZoomLevel(wholeLocation) {
        wholeLocation = wholeLocation || getLocation();
        if (wholeLocation && wholeLocation.length > 1) {
            return wholeLocation[1];
        } else {
            return '';
        }
    }

    function getDocId(wholeLocation) {
        wholeLocation = wholeLocation || getLocation();
        if (wholeLocation && wholeLocation.length > 0) {
            return wholeLocation[0];
        } else {
            return '';
        }
    }

    function checkIfLogged(cb) {
        if (typeof cb != 'function') {
            cb = function () {};
        }
        $.get('/isLogged', function (data) {
            if (data.isLogged) {
                cb(true);
                $('.hide-until-logged').css('display', 'block');
                $('.hide-when-logged').css('display', 'none');
                $('#of-login-form').removeClass('login');
                $('#of-login-form').addClass('logout');
            } else {
                cb(false);
                $('.hide-until-logged').css('display', 'none');
                $('.hide-when-logged').css('display', 'block');
                $('#of-login-form').removeClass('logout');
                $('#of-login-form').addClass('login');
            }
        });
    }

    checkIfLogged(function (result) {
        session.logged = result;
    });

    function loadDocs() {
        $('#of-filter-options').css('display', 'none');
        $dlist.empty();
        $.get('/doclist', function (data) {
            if (data.org) {
                $('#title').html(data.org);
                $('title').html('Org Chart: ' + data.org);
            } else {
                $('#title').html('Org Chart');
                $('title').html('Org Chart');
            }
            docs = data.list;
            for (var dx in docs) {
                var doc = docs[dx];
                var $doc = $doctpl.clone();
                $doc.attr('id', 'of-doc-box-for-' + doc._id);
                var isLogged = isLogged || false;
                if (!isLogged) {
                    checkIfLogged(function (result) {
                        isLogged = result;
                    });
                }

                if (!isLogged) {
                    $('.hide-until-logged', $doc).css('display', 'none');
                }
                
                var $renameForm = $('form', $doc);
                $renameForm.attr('action', '/renamedoc/' + doc._id);
                $renameForm.ajaxForm({
                    success: function (data) {
                        if (data && data.success && data.success !== false) {
                            var $tdoc = $('#of-doc-box-for-' + data.docid);
                            var $dname = $('.of-doc-title', $tdoc);
                            $dname.html(data.name);
                            $('.of-doc-rename', $tdoc).css('display', 'none');
                            $dname.css('display', 'block');
                        }
                    },
                    dataType: 'json'});
                
                $renameForm.click(function (event) {
                    event.stopPropagation();
                });

                var $dname = $('.of-doc-title', $doc);
                $dname.html(doc.name);
                $dname.click(function (event) {
                    if (session.logged) {
                        event.stopPropagation();
                        var $this = $(this);
                        $this.css('display', 'none');
                        var $namein = $('.of-doc-rename', $this.closest('.of-doc-box'));
                        $namein.val($this.html());
                        $namein.css('display', 'block');
                        $namein.focus();
                        $namein.select();
                    }
                });

                if (!doc.count) {
                    doc.count = 0;
                }
                $('.of-doc-number', $doc).html(doc.count);
                var ddate = new Date(doc.created-0);
                $('.of-doc-created', $doc).html(ddate.toDateString() + ' at ' + ddate.toTimeString());
                $doc.attr('data-docid', doc._id);
                $doc.click(function () {
                    var docid = $(this).attr('data-docid');
                    setLocation([docid]);
                });

                $('.of-doc-delete', $doc).click(function (event) {
                    event.stopPropagation();
                    var $pdoc = $(this).closest('.of-doc-box');
                    $.post('/deletedoc', {docid: $pdoc.attr('data-docid')}, function (data) {
                        if (data.success) {
                            $pdoc.remove();
                        }
                    });
                });

                $('.of-doc-copy', $doc).click(function (event) {
                    event.stopPropagation();
                    var $pdoc = $(this).closest('.of-doc-box');
                    $.post('/copydoc', {name: $('.of-doc-title', $pdoc).html(), docid: $pdoc.attr('data-docid')}, function (data) {
                        if (data.success) {
                            setLocation([]);
                        }
                    });
                });

                $dlist.append($doc);
            }
            var $orgchart = $('div.jOrgChart');
            if ($orgchart && $orgchart.length) {
                $orgchart.empty();
            }
            $dlist.css('display', 'block');
        });
    }

    function loadDoc(docid, zoomlevel) {
        var $orgchart = $('div#of-org-form-svg');
        if ($orgchart && $orgchart.length) {
            $orgchart.empty();
        }
        $units.empty();
        
        $('#of-filter-options').css('display', 'block');
        $dlist.css('display', 'none');

        $.get('/list/' + docid, function (data) {
            if (data.org) {
                $('#title').html(data.org);
                $('title').html('Org Chart: ' + data.org);
            } else {
                $('#title').html('Org Chart');
                $('title').html('Org Chart');
            }
            units = data.units;
	    locs = data.colors;
            loccodes = data.codes;
            for (var nx in data.list.none) {
                addTo($units, units[data.list.none[nx]], data.list, units);
            }
            createOrgChart();
            $('#of-display-sideways').click(function () {
                var $this = $(this);
                if ($this.is(':checked')) {
                    createOrgChart({sideways: true});
                } else {
                    createOrgChart({sideways: false});
                }
            });
        });
    }

    function addTo($parent, data, childlist, ulist) {
        if (data && (data.title || data.name || data.location || data.hours || data.reqn || data.status)) {
            childlist = childlist || [];
            ulist = ulist || {};
            if (data && data._id) {
                data.index = data._id;
            }
            if (data.supervisor) {
                $parent = $parent || $('#of-unit-box-for-'+data.supervisor, $of);
            } else {
                $parent = $parent || $units;
            }

            var $tc = $tunit.clone();
            var estat = data.status.toLowerCase();
            if (!data.name || data.name == '') {
                $tc.addClass('vacancy');
            } else if (estat == 'employee') {
                $tc.addClass(estat);
                $('option[value='+estat+']', $tc).attr('selected', 'selected');
            } else {
                estat = 'contractor';
                $tc.addClass(estat);
                $('option[value='+estat+']', $tc).attr('selected', 'selected');
            }
            $tc.attr('id', 'of-unit-box-for-'+data.index);
            $tc.attr('data-ofid', data.index);
            $('form', $tc).attr('action', '/modify/'+getDocId()+'/'+data.index);
            $('p.of-unit-title', $tc).html(data.title);
            $('input.of-unit-title', $tc).attr('value', data.title);
            $('p.of-unit-name', $tc).html(data.name);
            $('input.of-unit-name', $tc).attr('value', data.name);

            if (data.reqn && data.reqn != '') {
                $('span.of-unit-reqn', $tc).html(data.reqn);
                $('input.of-unit-reqn', $tc).attr('value', data.reqn);
            } else {
                $('.of-req-num', $tc).css('display', 'none');
                $('.of-unit-details', $tc).addClass('noreqn');
            }
            if (data.start && data.start != '') {
                $('span.of-unit-start', $tc).html(data.start);
                $('input.of-unit-start', $tc).attr('value', data.start);
            } else {
                $('.of-start-date', $tc).css('display', 'none');
            }
            if (data.end && data.end != '') {
                $('span.of-unit-end', $tc).html(data.end);
                $('input.of-unit-end', $tc).attr('value', data.end);
            } else {
                $('.of-end-date', $tc).css('display', 'none');
            }
            if (data.hours && data.hours != '') {
                $('span.of-unit-hrs', $tc).html(data.hours);
                $('input.of-unit-hours', $tc).attr('value', data.hours);
                if (data.hours-0 < 16) {
                    $tc.addClass('veryparttime');
                } else if (data.hours-0 < 32) {
                    $tc.addClass('parttime');
                } else {
                    $tc.addClass('fulltime');
                }
            } else {
                $('.of-hours-weekly', $tc).css('display', 'none');
            }
            var $ulist = $units;
            if (data.supervisor && data.supervisor != '') {
                $ulist = $parent.children('.of-unit-listing');
                if (!$ulist || !$ulist.length) {
                    $parent.append($tlist.clone());
                    $ulist = $('.of-unit-listing', $parent);
                }
            }

            var $loc = $('span.of-unit-loc', $tc);
            var $locc = $('span.of-unit-lc', $tc);

            if (data.location && data.location != '') {
                if (locs[data.location]) {
                    $loc.css('color', locs[data.location]);
                } else {
                    $loc.css('color', locs.other);
                }
                if (data.loccode && loccodes[data.loccode]) {
                    $locc.css('background-color', loccodes[data.loccode]);
                } else if (data.loccode) {
                    $locc.css('background-color', loccodes.other);
                } else {
                    $locc.css('display', 'none');
                }
                $loc.html(data.location);
                var loccode = '';
                if (data.loccode && data.loccode != '') {
                    loccode = data.loccode.slice(0,2);
                } else {
                    $locc.css('display', 'none');
                }
                $locc.html(loccode);

                $('input.of-unit-loc', $tc).attr('value', data.location);
                $('input.of-unit-lc', $tc).attr('value', loccode);
            } else {
                $loc.parent('p').css('display', 'none');
                $locc.css('display', 'none');
            }

            if (childlist[data.index] && childlist[data.index].length) {
                for (var ix in childlist[data.index]) {
                    addTo($tc, ulist[childlist[data.index][ix]], childlist, ulist);
                }
            }

            $ulist.append($tc);
        } else {
            return;
        }
    }

    loadDocs();
}

function createOrgChart(opts) {
    opts = $.extend({}, opts);
    opts.size = opts.size || 300;
    opts.height = opts.height || 100;
    if (opts.sideways || opts.sideways !== null) {
        opts.sideways = opts.sideways;
    } else {
        opts.sideways = true;
    }

    $(function() {
        var $svg = $('#of-org-form-svg');
        $svg.svg('destroy');
        $svg.empty();
        var sw = opts.sideways;
        $svg.attr(sw ? 'height' : 'width', 10);
        $svg.attr(sw ? 'width' : 'height', 10);
        $svg.svg({onLoad: drawInitial});
    });

    function doNode(w, ng, $nc) {
        var title = $('.of-unit-title', $nc).html();
        var name = $('.of-unit-name', $nc).html();
        var location = $('.of-unit-loc', $nc).html();

        var id = $nc.attr('id');
        if (id && id != '') {
            ng.id = 'svg-' + id;
        }

        var titleg = w.group(ng);
        w.text(titleg, title);

        var nameg = w.group(ng, {transform: 'translate(0, 30)'});
        w.text(nameg, name);

        var locg = w.group(ng, {transform: 'translate(0, 60)'});
        w.text(locg, location);
    }

    function clickNode(node, id) {
        console.log(id);
    }

    function drawInitial(svg) {
        var $orig = $('#of-org-form');
        svg.graph.noDraw().title('Org Chart Test')
            .type('orgchart')
            .options($.extend({orig: $orig,
                               size: 300,
                               padding: 20,
                               height: 100,
                               draw: doNode,
                               click: clickNode,
                               sideways: true}, opts))
            .redraw();
    }
}
