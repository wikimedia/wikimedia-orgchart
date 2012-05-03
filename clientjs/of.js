/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var orgForm = function () {
    var $ucreate = $('.of-unit-edit-form').first().clone();
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $dlist = $('#of-documents-list');
    var $doctpl = $('.of-doc-box').detach();
    var $docctpl = $('.of-doc-create').detach();
    var $units = $('#of-org-form');
    var docs = [];
    var units = {};
    var locs = {};
    var loccodes = {};
    var waiting = [];
    var session = {logged: false};
    var isLogged = false;
    var $of = $('#of-org-form');
    var $curzm = $of;
    var $curlist = $of.clone();
    var $oflist = $('#of-org-list-display');

    $oflist.html($curlist);

    $ucreate.attr('class', 'of-unit-create');

    $('.of-login-show').click(function () {
        var $lfrm = $('#of-login-form');
        if ($lfrm.hasClass('shown')) {
            $lfrm.removeClass('shown');
        } else {
            $lfrm.addClass('shown');
        }
    });

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
        isLogged = result;
    });

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

    function getDetails(uid, cb) {
        cb(units[uid]);
    }

    function postAdd($node, level) {
        $node.css('z-index', 29-level);

        // var name = $('.of-unit-name', $node).html().length;
        // var title = $('.of-unit-title', $node).html().length;
        // var status = $('.of-unit-status', $node).html().length;

        // var longest = name > title ? name : title;
        // longest = longest > status ? longest : status;
        // $node.css('width', (9*longest)+'px');
        
        $('.of-unit-show', $node).click(function () {
            var $this = $(this).closest('.of-unit-details');
            var state = $this.hasClass('shown');
            if (state) {
                $this.closest('.of-unit-details').removeClass('shown');
            } else {
                $this.closest('.of-unit-details').addClass('shown');
            }
        });
        
        $('.of-unit-edit', $node).click(function () {
            var $this = $(this);
            var $unit = $this.closest('.of-unit-details');
            $('.of-unit-view', $unit).css('display','none');
            $('.of-unit-edit-form', $unit).css('display','block');
            $unit.addClass('shown-temp');
        });

        $('.of-unit-remove-node', $node).click(function () {
            var $this = $(this);
            var $unit = $this.closest('.of-unit-details');
            $('.of-unit-view', $unit).css('display','none');
            $('.of-unit-delete-confirm', $unit).css('display','block');
            $unit.addClass('shown-temp');
        });
        
        $('.of-unit-remove-node-cancel', $node).click(function () {
            var $this = $(this);
            var $unit = $this.closest('.of-unit-details');
            $('.of-unit-view', $unit).css('display','block');
            $('.of-unit-delete-confirm', $unit).css('display','none');
            $unit.removeClass('shown-temp');
        });
        
        var $dform = $('.of-unit-delete-confirm-form', $node);
        $dform.attr('action', '/remove/' + getDocId() + '/' + $('li#'+$node.attr('id')).attr('data-ofid'));

        $dform.ajaxForm({
            success: function (data) {
                if (data && data.success) {
                    var $dnode = $('li#'+$node.attr('id'), $of);
                    var $clist = $('.of-unit-listing', $dnode);
                    if ($clist && $clist.length != 0 && $clist.children('li').length != 0) {
                        var $plist = $dnode.closest('ul');
                        $clist.children().each(function () {
                            $plist.append($(this).detach());
                        });
                    }
                    $dnode.remove();
                    refreshChart($curzm);
                }
            },
            dataType: 'json'});
        
        var $form = $('.of-unit-edit-form form', $node);
        
        $form.ajaxForm({
            success: function (data) {
                if (data.success) {
                    var $unit = $('div#of-unit-box-for-'+data.unit._id);
                    var $ud = $('.of-unit-details', $unit);
                    $ud.removeClass('shown-temp');
                    var u = data.unit;
                    $('.of-unit-view', $unit).css('display','block');
                    $('.of-unit-edit-form', $unit).css('display','none');
                    
                    var $name = $('p.of-unit-name', $unit);
                    if (u.name && u.name != $name.html()) {
                        $name.html(u.name);
                        $('input.of-unit-name', $unit).val(u.name);
                    }
                    var $title = $('p.of-unit-title', $unit);
                    if (u.title && u.title != $title.html()) {
                        $title.html(u.title);
                        $('input.of-unit-title', $unit).val(u.title);
                    }
                    var $uloc = $('span.of-unit-loc', $unit);
                    if (u.location && u.location != $uloc.html()) {
                        $uloc.html(u.location);
                        $('input.of-unit-loc', $unit).val(u.location);
                    }
                    var $ulc = $('span.of-unit-lc', $unit);
                    if (u.loccode && u.loccode != $ulc.html() || u.loccode != '') {
                        $ulc.css('display', 'block');
                        $ulc.html(u.loccode);
                        $('input.of-unit-lc', $unit).val(u.loccode);
                    } else if (!u.loccode || u.loccode == '') {
                        $ulc.css('display', 'none');
                    }
                    var $reqn = $('span.of-unit-reqn', $unit);
                    if (u.reqn && u.reqn != $reqn.html()) {
                        $reqn.html(u.reqn);
                        $('input.of-unit-reqn', $unit).val(u.reqn);
                    }
                    if (!u.reqn || u.reqn == '') {
                        $unit.addClass('noreqn');
                        $reqn.closest('p').css('display', 'none');
                    } else {
                        $reqn.closest('p').css('display', 'block');
                        $unit.removeClass('noreqn');
                    }
                    var $start = $('span.of-unit-start', $unit);
                    if (u.start && u.start != $start.html()) {
                        $start.html(u.start);
                        $('input.of-unit-start', $unit).val(u.start);
                    }
                    if (u.start == '') {
                        $start.closest('p').css('display', 'none');
                    }
                    var $end = $('span.of-unit-end', $unit);
                    if (u.end && u.end != $end.html()) {
                        $end.html(u.end);
                        $('input.of-unit-end', $unit).val(u.end);
                    }
                    if (u.end == '') {
                        $end.closest('p').css('display', 'none');
                    }
                    var $hours = $('span.of-unit-hrs', $unit);
                    if (u.hours && u.hours != $hours.html()) {
                        $hours.html(u.hours);
                        $('input.of-unit-hours', $unit).val(u.hours);
                    }
                    if (u.hours == '') {
                        $hours.closest('p').css('display', 'none');
                    }
                    var status = $name.html().length ? ($unit.hasClass('employee') ? 'employee' : 'contractor') : 'vacancy';
                    if (u.status && status != u.status) {
                        $unit.removeClass(status);
                        $unit.addClass(u.status.toLowerCase());
                    }
                }
            },
            dataType: 'json',
        });
        
        if (level) {
            $('.of-unit-zoom', $node).click(function () {
                setLocation([getDocId(), $(this).closest('.of-unit-box').attr('id')]);
            });
        } else {
            $('.of-unit-zoom', $node).html('Full chart');
            $('.of-unit-zoom', $node).click(function () {
                setLocation([getDocId()]);
            });
        }

        $('.of-unit-cancel-edit', $node).click(function () {
            var $this = $(this);
            var $unit = $this.closest('.of-unit-details');
            $('.of-unit-view', $unit).css('display','block');
            $('.of-unit-edit-form', $unit).css('display','none');
            $unit.removeClass('shown-temp');
        });

        $('.of-unit-add-child', $node).click(function () {
            var $this = $(this);
            var $unit = $this.closest('.of-unit-details');
            var $uv = $('.of-unit-view', $unit);
            $uv.css('display','none');
            $unit.append($ucreate.clone());
            var $tcreate = $('.of-unit-create', $unit);
            $tcreate.css('display','block');

            $('.of-unit-cancel-edit', $tcreate).click(function () {
                $tcreate.remove();
                $uv.css('display','block');
                $unit.removeClass('shown-temp');
            });

            var $cform = $('form', $tcreate);
            
            $cform.attr('action', '/addto/' + getDocId() + '/' + $('li#'+$node.attr('id')).attr('data-ofid'));

            $cform.ajaxForm({
                success: function (data) {
                    $unit.removeClass('shown-temp');
                    $tcreate.remove();
                    $uv.css('display','block');
                    addTo(data.unit[0]);
                },
                dataType: 'json'});
            $unit.addClass('shown-temp');
        });
    }

    function addTo(data, childlist, $parent, checkLog) {
        if (data && (data.title || data.name || data.location || data.hours || data.reqn || data.status)) {
            childlist = childlist || [];
            if (data && data._id) {
                data.index = data._id;
            }
            if (data.supervisor) {
                $parent = $parent || $('#of-unit-box-for-'+data.supervisor, $of);
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
            var $ulist = $('.of-unit-listing', $parent).first();
            if (data.supervisor && data.supervisor != '') {
                var $super = $('#of-unit-box-for-'+data.supervisor, $units);
                $ulist = $super.children('.of-unit-listing');
                if (!$ulist || !$ulist.length) {
                    $super.append($tlist.clone());
                    $ulist = $('.of-unit-listing', $super);
                }
            }

            if (!$ulist || !$ulist.length) {
                $ulist = $units;
                if (!$ulist || !$ulist.length) {
                    return;
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

            $ulist.append($tc);

            var wix = waiting.indexOf(data.index);
            if (wix != -1) {
                waiting = waiting.slice(0, wix).concat(waiting.slice(wix+1));
            }

            if (childlist[data.index] && childlist[data.index].length) {
                for (var ix in childlist[data.index]) {
                    getDetails(childlist[data.index][ix], function (ndata) {
                        handleData(childlist, ndata);
                    });
                }
            } else if (waiting.length == 0) {
                var startZoom = getZoomLevel();
                if (startZoom == '') {
                    refreshChart($of);
                } else {
                    refreshChart($('#' + startZoom));
                }
                if (checkLog) {
                    if (isLogged) {
                        $('.hide-until-logged').css('display', 'block');
                        $('.hide-when-logged').css('display', 'none');
                        $('#of-login-form').removeClass('login');
                        $('#of-login-form').addClass('logout');
                    } else {
                        $('.hide-until-logged').css('display', 'none');
                        $('.hide-when-logged').css('display', 'block');
                        $('#of-login-form').removeClass('logout');
                        $('#of-login-form').addClass('login');
                    }
                }
            }
        } else {
            return;
        }
    }

    function refreshChart($data) {
        $curzm = $data;
        var wholeLocation = getLocation();
        if (getZoomLevel(wholeLocation) == '') {
            $('#of-zoom-out').attr('disabled', 'disabled');
            $curlist = $('<ul></ul').html($('li', $curzm).clone());
            $oflist.html($curlist);
        } else {
            $('#of-zoom-out').removeAttr('disabled');
            $curlist = $curzm.clone();
            $oflist.html($curlist);
        }
        $('.jOrgChart').remove();
        $data.jOrgChart({highlightParent: true,
                         collapse: false,
                         cb: postAdd,
                         except: 'render-except'});
    }

    function handleData(data, ddata) {
        units[ddata.index] = ddata;
        addTo(ddata, data, null, true);
    }

    function addWait(thelist, thislist, biglist) {
        for (var ix in thislist) {
            thelist.push(thislist[ix]);
            if (biglist[thislist[ix]] && biglist[thislist[ix]].length) {
                addWait(thelist, biglist[thislist[ix]], biglist);
            }
        }
    }

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
        var $orgchart = $('div.jOrgChart');
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
            addWait(waiting, data.list.none, data.list);
            for (var ix in data.list.none) {
                getDetails(data.list.none[ix], function (ddata) {
                    handleData(data.list, ddata);
                });
            }
        });
    }

    var docId = getDocId();
    var zoomLevel = getZoomLevel();
    if (docId != '') {
        if (zoomLevel != '') {
            loadDoc(docId, zoomLevel);
        } else {
            loadDoc(docId);
        }
    } else {
        loadDocs();
    }

    $('#of-zoom-out').click(function () {
        refreshChart($of);
    });
    
    $('#of-home-page').click(function () {
        setLocation([]);
    });

    $('#of-new-doc').click(function () {
        var $dcc = $docctpl.clone();
        var $dcfrm = $('form', $dcc);
        
        $dcfrm.ajaxForm({
            success: function (data) {
                setLocation([]);
            },
            dataType: 'json'});
        
        $('.of-doc-create-cancel', $dcc).click(function () {
            $(this).closest('li').remove();
        });
        
        $dlist.prepend($dcc);
    });

    $('#of-filter-vacant').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        var $vacancies = $('.of-unit-box.vacancy');
        if (ison) {
            $vacancies.each(function () {
                var $node = $(this);
                $node.removeClass('render-except');
                $('.of-unit-view', $node).css('display','block');
                $('.of-unit-collapsed', $node).css('display','none');
                $node.css('width', '250px');
                $node.css('height', '75px');
            });
        } else {
            $vacancies.each(function () {
                var $node = $(this);
                $node.addClass('render-except');
                $('.of-unit-view', $node).css('display','none');
                $('.of-unit-collapsed', $node).css('display','block');
                $node.css('width', '5px');
                $node.css('height', 'auto');
            });
        }
        refreshChart($curzm);
    });

    $('#of-filter-contract').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        var $contractors = $('.of-unit-box.contractor');
        if (ison) {
            $contractors.each(function () {
                var $node = $(this);
                $node.removeClass('render-except');
                $('.of-unit-view', $node).css('display','block');
                $('.of-unit-collapsed', $node).css('display','none');
                $node.css('width', '250px');
                $node.css('height', '75px');
            });
        } else {
            $contractors.each(function () {
                var $node = $(this);
                $node.addClass('render-except');
                $('.of-unit-view', $node).css('display','none');
                $('.of-unit-collapsed', $node).css('display','block');
                $node.css('width', '5px');
                $node.css('height', 'auto');
            });
        }
        refreshChart($curzm);
    });

    $('#of-filter-employee').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        var $employees = $('.of-unit-box.employee');
        if (ison) {
            $employees.each(function () {
                var $node = $(this);
                $node.removeClass('render-except');
                $('.of-unit-view', $node).css('display','block');
                $('.of-unit-collapsed', $node).css('display','none');
                $node.css('width', '250px');
                $node.css('height', '75px');
            });
        } else {
            $employees.each(function () {
                var $node = $(this);
                $node.addClass('render-except');
                $('.of-unit-view', $node).css('display','none');
                $('.of-unit-collapsed', $node).css('display','block');
                $node.css('width', '5px');
                $node.css('height', 'auto');
            });
        }
        refreshChart($curzm);
    });

    $('#of-expand-all').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        if (ison) {
            $('.of-unit-details').addClass('shown');
        } else {
            $('.of-unit-details').removeClass('shown');
        }
    });

    $('#of-login-form-in>form').ajaxForm({
        success: function (data) {
            if (data && data.success && data.success !== false) {
                isLogged = true;
                session.logged = true;
                session.name = data.name;
                $('.hide-until-logged').css('display', 'block');
                $('.hide-when-logged').css('display', 'none');
                $('#of-login-form').removeClass('login');
                $('#of-login-form').addClass('logout');
            }
        },
        dataType: 'json'});

    $('#of-login-form-out>form').ajaxForm({
        success: function (data) {
            if (data && data.success && data.success !== false) {
                isLogged = false;
                session.logged = false;
                delete session.name;
                $('.hide-until-logged').css('display', 'none');
                $('.hide-when-logged').css('display', 'block');
                $('#of-login-form').removeClass('logout');
                $('#of-login-form').addClass('login');
            }
        },
        dataType: 'json'});
};
