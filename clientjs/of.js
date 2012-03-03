var orgForm = function () {
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $units = $('#of-org-form');
    var units = {};
    var locs = {};

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
            $('.of-unit-title', $tc).html(ddata.title);
            $('.of-unit-name', $tc).html(ddata.name);

            if (ddata.reqn && ddata.reqn != '') {
                $('.of-unit-reqn', $tc).html(ddata.reqn);
            } else {
                $('.of-req-num', $tc).remove();
                $('.of-unit-details', $tc).addClass('noreqn');
            }
            if (ddata.start && ddata.start != '') {
                $('.of-unit-start', $tc).html(ddata.start);
            } else {
                $('.of-start-date', $tc).remove();
            }
            if (ddata.end && ddata.end != '') {
                $('.of-unit-end', $tc).html(ddata.end);
            } else {
                $('.of-end-date', $tc).remove();
            }
            if (ddata.hours && ddata.hours != '') {
                $('.of-unit-hrs', $tc).html(ddata.hours);
                if (ddata.hours-0 < 16) {
                    $tc.addClass('veryparttime');
                } else if (ddata.hours-0 < 32) {
                    $tc.addClass('parttime');
                } else {
                    $tc.addClass('fulltime');
                }
            } else {
                $('.of-hours-weekly', $tc).remove();
            }
            var $ulist = $units;
            if (ddata.supervisor && ddata.supervisor != '') {
                var $super = $('#of-unit-box-for-'+ddata.supervisor, $units);
                $ulist = $('.of-unit-listing', $super);
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

            var $loc = $('.of-unit-loc', $tc);
            if (ddata.location && ddata.location != '' && locs[ddata.location]) {
                $loc.css('color', locs[ddata.location]);
                $loc.html(ddata.location);
            } else {
                $loc.remove();
            }

            $ulist.append($tc);
            if (data[ddata.index] && data[ddata.index].length) {
                for (var ix in data[ddata.index]) {
                    $.get('/details/'+data[ddata.index][ix], function (ndata) {
                        handleData(data, ndata);
                    });
                }
            }
        }
    }

    $.get('/colors', function (data) {
        locs = data;
        
    });

    $.get('/list', function (data) {
        for (var ix in data.none) {
            $.get('/details/'+data.none[ix], function (ddata) {
                handleData(data, ddata);
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
