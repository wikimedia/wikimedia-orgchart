var orgForm = function () {
    var $ucreate = $('.of-unit-edit-form').first().clone();
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $units = $('#of-org-form');
    var units = {};
    var locs = {};
    var waiting = [];
    var session = {logged: false};
    var isLogged = false;
    $ucreate.attr('class', 'of-unit-create');

    $.get('/isLogged', function (data) {
        if (data.isLogged) {
            $('.hide-until-logged').css('display', 'block');
            $('.hide-when-logged').css('display', 'none');
            isLogged = true;
        } else {
            $('.hide-until-logged').css('display', 'none');
            $('.hide-when-logged').css('display', 'block');
        }
    });

    function getDetails(uid, cb) {
        cb(units[uid]);
    }

    function postAdd($node, level) {
        $node.css('z-index', 29-level);

        var name = $('.of-unit-name', $node).html().length;
        var title = $('.of-unit-title', $node).html().length;
        var status = $('.of-unit-status', $node).html().length;

        var longest = name > title ? name : title;
        longest = longest > status ? longest : status;
        $node.css('width', (9*longest)+'px');
        
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
        $dform.attr('action', '/remove/' + $('li#'+$node.attr('id')).attr('data-ofid'));

        $dform.ajaxForm({
            success: function (data) {
                if (data && data.success) {
                    var $of = $('#of-org-form');
                    var $dnode = $('li#'+$node.attr('id'), $of);
                    var $clist = $('.of-unit-listing', $dnode);
                    if ($clist && $clist.length != 0 && $clist.children('li').length != 0) {
                        var $plist = $dnode.closest('ul');
                        $clist.children().each(function () {
                            $plist.append($(this).detach());
                        });
                    }
                    $dnode.remove();
                    refreshChart($of);
                }
            },
            dataType: 'json'});
        
        var $form = $('.of-unit-edit-form form', $node);
        
        $form.ajaxForm({
            success: function (data) {
                if (data.success) {
                    var $unit = $('div#of-unit-box-for-'+data.unit._id+' .of-unit-details');
                    var u = data.unit;
                    $('.of-unit-view', $unit).css('display','block');
                    $('.of-unit-edit-form', $unit).css('display','none');
                    
                    var $name = $('span.of-unit-name', $unit);
                    if (u.name && u.name != $name.html()) {
                        $name.html(u.name);
                        $('input.of-unit-name', $unit).val(u.name);
                    }
                    if (u.name == '') {
                        $('.of-unit-status', $unit).html('This position is vacant.');
                    }
                    var $title = $('span.of-unit-title', $unit);
                    if (u.title && u.title != $title.html()) {
                        $title.html(u.title);
                        $('input.of-unit-title', $unit).val(u.title);
                    }
                    var $uloc = $('span.of-unit-loc', $unit);
                    if (u.location && u.location != $uloc.html()) {
                        $uloc.html(u.location);
                        $('input.of-unit-loc', $unit).val(u.location);
                    }
                    var $reqn = $('span.of-unit-reqn', $unit);
                    if (u.reqn && u.reqn != $reqn.html()) {
                        $reqn.html(u.reqn);
                        $('input.of-unit-reqn', $unit).val(u.reqn);
                    }
                    if (u.reqn == '') {
                        $reqn.closest('p').css('display', 'none');
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
                }
            },
            dataType: 'json',
        });
        
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
            
            $cform.attr('action', '/addto/' + $('li#'+$node.attr('id')).attr('data-ofid'));

            $cform.ajaxForm({
                success: function (data) {
                    $tcreate.remove();
                    $uv.css('display','block');
                    addTo(data.unit[0]);
                },
                dataType: 'json'});
            $unit.addClass('shown-temp');
        });
    }

    function addTo(data, childlist, $parent, checkLog) {
        var $of = $('#of-org-form');
        if (data && data.title) {
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
                $('.of-unit-status', $tc).html('This position is open');
                $tc.addClass('vacancy');
            } else if (estat == 'employee') {
                $('.of-unit-status', $tc).html('Status: Employee');
                $tc.addClass(estat);
                $('option[value='+estat+']', $tc).attr('selected', 'selected');
            } else {
                estat = 'contractor';
                $('.of-unit-status', $tc).html('Status: Independent contractor');
                $tc.addClass(estat);
                $('option[value='+estat+']', $tc).attr('selected', 'selected');
            }
            $tc.attr('id', 'of-unit-box-for-'+data.index);
            $tc.attr('data-ofid', data.index);
            $('form', $tc).attr('action', '/modify/'+data.index);
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
            var $ulist = $('.of-unit-listing', $parent);
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
            if (data.location && data.location != '') {
                if (locs[data.location]) {
                    $loc.css('color', locs[data.location]);
                } else {
                    $loc.css('color', locs.other);
                }
                $loc.html(data.location);
                var loccode = '';
                if (data.loccode && data.loccode != '') {
                    loccode = data.loccode;
                } else {
                    loccode = data.location.replace(/[a-z ]/g, '').slice(0,2);
                }
                $('span.of-unit-lc', $tc).html(loccode);

                $('input.of-unit-loc', $tc).attr('value', data.location);
                $('input.of-unit-lc', $tc).attr('value', loccode);
            } else {
                $loc.parent('p').css('display', 'none');
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
                refreshChart($of);
                if (checkLog) {
                    if (isLogged) {
                        $('.hide-until-logged').css('display', 'block');
                        $('.hide-when-logged').css('display', 'none');
                    } else {
                        $('.hide-until-logged').css('display', 'none');
                        $('.hide-when-logged').css('display', 'block');
                    }
                }
            }
        } else {
            return;
        }
    }

    function refreshChart($data) {
        $('.jOrgChart').remove();
        $data.jOrgChart({highlightParent: true,
                         collapse: false,
                         cb: postAdd});
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

    $.get('/list', function (data) {
        units = data.units;
	locs = data.colors;
        if (data.org) {
            $('#title').html(data.org);
            $('title').html('Org Chart: ' + data.org);
        }
        addWait(waiting, data.list.none, data.list);
        for (var ix in data.list.none) {
            getDetails(data.list.none[ix], function (ddata) {
                handleData(data.list, ddata);
            });
        }
    });

    $('#of-filter-vacant').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        var $vacancies = $('.of-unit-box.vacancy');
        if (ison) {
            $vacancies.each(function () {
                var $node = $(this);
                $('.of-unit-view', $node).css('display','block');
                $('.of-unit-collapsed', $node).css('display','none');
                $node.css('width', '250px');
                $node.css('height', '75px');
            });
        } else {
            $vacancies.each(function () {
                var $node = $(this);
                $('.of-unit-view', $node).css('display','none');
                $('.of-unit-collapsed', $node).css('display','block');
                $node.css('width', '5px');
                $node.css('height', 'auto');
            });
        }
    });

    $('#of-filter-contract').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        var $contractors = $('.of-unit-box.contractor');
        if (ison) {
            $contractors.each(function () {
                var $node = $(this);
                $('.of-unit-view', $node).css('display','block');
                $('.of-unit-collapsed', $node).css('display','none');
                $node.css('width', '250px');
                $node.css('height', '75px');
            });
        } else {
            $contractors.each(function () {
                var $node = $(this);
                $('.of-unit-view', $node).css('display','none');
                $('.of-unit-collapsed', $node).css('display','block');
                $node.css('width', '5px');
                $node.css('height', 'auto');
            });
        }
    });

    $('#of-filter-employee').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        var $employees = $('.of-unit-box.employee');
        if (ison) {
            $employees.each(function () {
                var $node = $(this);
                $('.of-unit-view', $node).css('display','block');
                $('.of-unit-collapsed', $node).css('display','none');
                $node.css('width', '250px');
                $node.css('height', '75px');
            });
        } else {
            $employees.each(function () {
                var $node = $(this);
                $('.of-unit-view', $node).css('display','none');
                $('.of-unit-collapsed', $node).css('display','block');
                $node.css('width', '5px');
                $node.css('height', 'auto');
            });
        }
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
                session.logged = true;
                session.name = data.name;
                $('.hide-until-logged').css('display', 'block');
                $('.hide-when-logged').css('display', 'none');
            }
        },
        dataType: 'json'});

    $('#of-login-form-out>form').ajaxForm({
        success: function (data) {
            if (data && data.success && data.success !== false) {
                session.logged = false;
                delete session.name;
                $('.hide-until-logged').css('display', 'none');
                $('.hide-when-logged').css('display', 'block');
            }
        },
        dataType: 'json'});
};
