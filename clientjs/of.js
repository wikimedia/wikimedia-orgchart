var orgForm = function () {
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $units = $('#of-org-form');
    var units = {};
    
    $.get('/list', function (data) {
        for (var ix in data) {
            $.get('/details/'+data[ix], function (ddata) {
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
                    $('.of-unit-reqn', $tc).html(ddata.reqn);
                    $('.of-unit-start', $tc).html(ddata.start);
                    $('.of-unit-end', $tc).html(ddata.end);
                    $('.of-unit-hrs', $tc).html(ddata.hours);
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
                }
            });
        }
    });
};
