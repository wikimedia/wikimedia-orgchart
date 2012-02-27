var orgForm = function () {
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $units = $('#of-org-form');
    var units = {};

    function handleData(data, ddata) {
        if (ddata && ddata.title) {
            units[ddata.index] = ddata;
            var $tc = $tunit.clone();
            if (!ddata.name || ddata.name == '')
                $tc.addClass('vacancy');
            else if (ddata.status.toLowerCase() == 'employee')
                $tc.addClass('employee');
            else
                $tc.addClass('contractor');
            $tc.attr('id', 'of-unit-box-for-'+ddata.index);
            $('.of-unit-title', $tc).html(ddata.title);
            $('.of-unit-name', $tc).html(ddata.name);

            if (ddata.reqn && ddata.reqn != '') {
                $('.of-unit-reqn', $tc).html(ddata.reqn);
            } else {
                $('.of-req-num', $tc).remove();
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

    $.get('/list', function (data) {
        for (var ix in data.none) {
            $.get('/details/'+data.none[ix], function (ddata) {
                handleData(data, ddata);
            });
        }
    });
};
