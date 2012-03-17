var orgForm = function () {
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $units = $('#of-org-form');
    var units = {};
    var locs = {};
    var waiting = [];

    function getDetails(uid, cb) {
        cb(units[uid]);
    }

    function handleData(data, ddata) {
        if (ddata && ddata.title) {
            units[ddata.index] = ddata;
            var $tc = $tunit.clone();
            if (!ddata.name || ddata.name == '') {
                $('.of-unit-status', $tc).html('This position is open');
                $tc.addClass('vacancy');
            } else if (ddata.status.toLowerCase() == 'employee') {
                $('.of-unit-status', $tc).html('Status: Employee');
                $tc.addClass('employee');
            } else {
                $tc.addClass('contractor');
                $('.of-unit-status', $tc).html('Status: Independent contractor');
            }
            $tc.attr('id', 'of-unit-box-for-'+ddata.index);
            $('form', $tc).attr('action', '/modify/'+ddata.index);
            $('p.of-unit-title', $tc).html(ddata.title);
            $('input.of-unit-title', $tc).val(ddata.title);
            $('p.of-unit-name', $tc).html(ddata.name);
            $('input.of-unit-name', $tc).val(ddata.name);

            if (ddata.reqn && ddata.reqn != '') {
                $('span.of-unit-reqn', $tc).html(ddata.reqn);
                $('input.of-unit-reqn', $tc).val(ddata.reqn);
            } else {
                $('.of-req-num', $tc).css('display', 'none');
                $('.of-unit-details', $tc).addClass('noreqn');
            }
            if (ddata.start && ddata.start != '') {
                $('span.of-unit-start', $tc).html(ddata.start);
                $('input.of-unit-start', $tc).val(ddata.start);
            } else {
                $('.of-start-date', $tc).css('display', 'none');
            }
            if (ddata.end && ddata.end != '') {
                $('span.of-unit-end', $tc).html(ddata.end);
                $('input.of-unit-end', $tc).val(ddata.end);
            } else {
                $('.of-end-date', $tc).css('display', 'none');
            }
            if (ddata.hours && ddata.hours != '') {
                $('span.of-unit-hrs', $tc).html(ddata.hours);
                $('input.of-unit-hours', $tc).val(ddata.hours);
                if (ddata.hours-0 < 16) {
                    $tc.addClass('veryparttime');
                } else if (ddata.hours-0 < 32) {
                    $tc.addClass('parttime');
                } else {
                    $tc.addClass('fulltime');
                }
            } else {
                $('.of-hours-weekly', $tc).css('display', 'none');
            }
            var $ulist = $units;
            if (ddata.supervisor && ddata.supervisor != '') {
                var $super = $('#of-unit-box-for-'+ddata.supervisor, $units);
                $ulist = $super.children('.of-unit-listing');
                if (!$ulist || !$ulist.length) {
                    $super.append($tlist.clone());
                    $ulist = $('.of-unit-listing', $super);
                }
            }

            $('.of-unit-show', $tc).click(function () {
                var $this = $(this);
                var state = $this.html();
                if (state == '+') {
                    $this.closest('.of-unit-details').addClass('shown');
                    $this.html('-');
                } else {
                    $this.closest('.of-unit-details').removeClass('shown');
                    $this.html('+');
                }
            });

            $('.of-unit-edit', $tc).click(function () {
                var $this = $(this);
                var $unit = $this.closest('.of-unit-details');
                $('.of-unit-view', $unit).css('display','none');
                $('.of-unit-edit-form', $unit).css('display','block');
            });

            var $form = $('.of-unit-edit-form form', $tc);
            
            $form.ajaxForm({
                success: function (data) {
                    if (data.success) {
                        var $unit = $('#of-unit-box-for-'+data.unit._id+' .of-unit-details');
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
                           
            $('.of-unit-cancel-edit', $tc).click(function () {
                var $this = $(this);
                var $unit = $this.closest('.of-unit-details');
                $('.of-unit-view', $unit).css('display','block');
                $('.of-unit-edit-form', $unit).css('display','none');
                return 0;
            });

            var $loc = $('span.of-unit-loc', $tc);
            if (ddata.location && ddata.location != '' && locs[ddata.location]) {
                $loc.css('color', locs[ddata.location]);
                $loc.html(ddata.location);
                $('input.of-unit-loc', $tc).val(ddata.location);
            } else {
                $loc.css('display', 'none');
            }

            $('.of-unit-details', $tc).hover(function () {
                $(this).closest('.of-unit-listing').addClass('super-select');
            }, function () {
                $(this).closest('.of-unit-listing').removeClass('super-select');
            });

            $ulist.append($tc);
            var wix = waiting.indexOf(ddata.index);
            waiting = waiting.slice(0, wix).concat(waiting.slice(wix+1));
            if (data[ddata.index] && data[ddata.index].length) {
                for (var ix in data[ddata.index]) {
                    getDetails(data[ddata.index][ix], function (ndata) {
                        handleData(data, ndata);
                    });
                }
            } else if (waiting.length == 0) {
                $('#of-org-form').jOrgChart({highlightParent: true});
            }
        }
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
        if (ison) {
            $('.of-unit-box.vacancy').removeClass('hidden');
        } else {
            $('.of-unit-box.vacancy').addClass('hidden');
        }
    });

    $('#of-filter-contract').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        if (ison) {
            $('.of-unit-box.contractor').removeClass('hidden');
        } else {
            $('.of-unit-box.contractor').addClass('hidden');
        }
    });

    $('#of-filter-employee').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        if (ison) {
            $('.of-unit-box.employee').removeClass('hidden');
        } else {
            $('.of-unit-box.employee').addClass('hidden');
        }
    });

    $('#of-expand-all').change(function () {
        var $this = $(this);
        var ison = $this.is(':checked');
        if (ison) {
            $('.of-unit-details').addClass('shown');
            $('.of-unit-show').html('-');
        } else {
            $('.of-unit-details').removeClass('shown');
            $('.of-unit-show').html('+');
        }
    });
};
