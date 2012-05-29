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

function getOpts(wholeLocation) {
    wholeLocation = wholeLocation || getLocation();
    var opts = {};
    if (wholeLocation && wholeLocation.length > 2) {
        var optstr = wholeLocation[2];
        if (optstr.length > 1) {
            var olist = optstr.slice(1).split('&');
            for (var ox in olist) {
                var thisone = olist[ox].split('=');
                if (thisone[1] == 'true') {
                    thisone[1] = true;
                } else if (thisone[1] == 'false') {
                    thisone[1] = false;
                }

                opts[thisone[0]] = thisone[1];
            }
        }
    }
    return opts;
}

var findAndHighlight = function (w, str) {
    $('.of-node-text').each(function () {
        w.change(this.nextSibling, {fill: 'none'});
        if (str == '') {
            return;
        }
        if (this.textContent.toLowerCase().indexOf(str.toLowerCase()) != -1) {
            w.change(this.nextSibling, {fill: 'yellow'});
        }
    });
};

function orgChart() {
    var $uedit = $('.of-unit-edit-form').first().detach().clone();
    var $ucreate = $uedit.clone().attr('class', '.of-unit-create');
    var $udelete = $('.of-unit-delete-confirm').first().clone();
    var $tunit = $('.of-unit-box').detach();
    var $tlist = $('.of-unit-listing').detach();
    var $dlist = $('#of-documents-list');
    var $doctpl = $('.of-doc-box').detach();
    var $docctpl = $('.of-doc-create').detach();
    var $inspector = $('#of-inspector');
    var $pernode = $('#of-options-pernode');
    var fields = ['name', 'title', 'loc', 'reqn', 'start', 'end', 'hrs'];
    var $uev = $('#of-edit-viewport');
    var session = {};
    var $units = $('#of-org-form');
    var units = {};
    var locs = {};
    var loccodes = {};
    var svg = null;
    
    $('#of-username, #of-search-box').focus(function () {
        var $this = $(this);
        $this.addClass('edittime');
        var defVal = $this.data('defaultValue');
        var curVal = $this.val();
        if (!defVal) {
            $this.data('defaultValue', curVal);
            defVal = curVal;
        }
        if (curVal === defVal) {
            $this.val('');
        }
    });
    
    $('#of-fake-password').focus(function () {
        $(this).hide();
        $('#of-password').show().focus();
    });
    
    $('#of-password').blur(function () {
        var $this = $(this);
        if ($this.val() === '') {
            $this.hide();
            $('#of-fake-password').show();
        }
    });
    
    $('#of-username, #of-search-box').blur(function () {
        var $this = $(this);
        var defVal = $this.data('defaultValue');
        if ($this.val() === '') {
            $this.val(defVal);
            $this.removeClass('edittime');
        }
    });

    function setLocation(wholeLocation, opts) {
        var optstr = '?';
        if (wholeLocation.length > 2 && typeof wholeLocation[2] == typeof {}) {
            optstr = wholeLocation[2];
        }
        
        if (!opts || typeof opts != typeof {}) {
            opts = {};
        }

        if (!wholeLocation) {
            wholeLocation = [];
        }

        while (wholeLocation.length < 3) {
            wholeLocation.push('');
        }

        for (var ox in opts) {
            if (optstr.length > 1) {
                optstr += '&';
            }
            optstr += ox + '=' + opts[ox];
        }
        if (optstr.length > 1) {
            wholeLocation[2] = optstr;
        } else {
            wholeLocation.pop();
        }

        if (wholeLocation[0] == '') {
            wholeLocation[1] = '';
        }
        
        var newloc = wholeLocation.join('/');
        
        if ('#'+newloc == document.location.hash) {
            $(window).hashchange();
        } else {
            document.location.hash = newloc;
        }
    }

    $('#of-resize-bar').click(function () {
        $(this).toggleClass('resize-again');
        $(document.body).toggleClass('hidden-details');
    });

    $('#of-home-page').click(function () {
        var wholeLocation = getLocation();
        while (wholeLocation.length < 2) {
            wholeLocation.push('');
        }
        wholeLocation[0] = '';
        wholeLocation[1] = '';
        setLocation(wholeLocation);
    });
    
    $('#of-edit-plaintext').click(function() {
        var wholeLocation = getLocation();
        if (wholeLocation && wholeLocation.length != 0 && wholeLocation[0] != '') {
            loadEditPlain(wholeLocation[0]);
        }
    });
    
    $('#of-zoom-out').click(function () {
        var wholeLocation = getLocation();
        var opts = getOpts(wholeLocation);
        while (wholeLocation.length < 2) {
            wholeLocation.push('');
        }
        wholeLocation[1] = '';
        setLocation(wholeLocation, opts);
    });
    
    $('#of-create-user').click(function () {
        window.location.pathname = '/usercreate';
        return 0;
    });

    $('#of-add-report').click(function () {
        $uev.addClass('filled');
        $uev.html($ucreate.clone());
        var $form = $('form', $uev);
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
        $form.attr('action', '/addto/'+getDocId()+'/'+unitid);
        $form.ajaxForm({
            success: function () {
                $uev.removeClass('filled');
                $uev.empty();
                setLocation(getLocation());
            }
        });
        $('.of-unit-cancel-edit', $form).click(function () {
            $uev.removeClass('filled');
            $uev.empty();
        });
    });
    
    $('#of-edit-node').click(function () {
        $uev.addClass('filled');
        $uev.html($uedit.clone());
        var $form = $('form', $uev)
        $('input', $form).val('');
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
        var $old = $('#'+oldid);
        for (var fx in fields) {
            var fn = fields[fx];
            var $input = $('input[name='+fn+']', $form);
            $input.val($('#of-inspector-'+fn+' .value', $inspector).html());
        }
        var status = $old.hasClass('employee') ? 'employee' : ($old.hasClass('contractor') ? 'contractor' : 'vacancy');
        $('option[value='+status+']', $form).attr('selected', 'selected');
        $('input[name=loccode]', $form).val($('.of-unit-lc', $old).html());
        $('input[name=location]', $form).val($('.of-unit-loc', $old).html());
        $('input[name=hours]', $form).val($('.of-unit-hrs', $old).html());
        $('input[name=end]', $form).datepicker({dateFormat: 'yy-mm-dd'});
        $('input[name=start]', $form).datepicker({dateFormat: 'yy-mm-dd'});
        $form.attr('action', '/modify/'+getDocId()+'/'+unitid);
        $form.ajaxForm({
            success: function () {
                $uev.removeClass('filled');
                $uev.empty();
                setLocation(getLocation());
            }
        });
        $('.of-unit-cancel-edit', $form).click(function () {
            $uev.removeClass('filled');
            $uev.empty();
        });
    });
    
    $('#of-delete-node').click(function () {
        $uev.addClass('filled');
        $uev.html($udelete.clone());
        var $form = $('form', $uev);
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
        $form.attr('action', '/remove/'+getDocId()+'/'+unitid);
        $form.ajaxForm({
            success: function () {
                $uev.removeClass('filled');
                $uev.empty();
                setLocation(getLocation());
            }
        });
        $('.of-unit-remove-node-cancel', $uev).click(function () {
            $uev.removeClass('filled');
            $uev.empty();
        });
    });
    
    $('#of-zoom-here').click(function () {
        var oldid = $inspector.data('oldid');
        var location = getLocation() || [];
        var opts = getOpts(location);
        while (location.length < 2) {
            location.push('');
        }
        location[1] = oldid;
        setLocation(location, opts);
    });
    $('#of-display-sideways').click(function () {
        var $this = $(this);
        if ($this.is(':checked')) {
            addToOpts({sideways: true});
        } else {
            addToOpts({sideways: false});
        }
    });
    
    $('#of-display-printable').click(function () {
        var $this = $(this);
        if ($this.is(':checked')) {
            addToOpts({printable: true});
        } else {
            addToOpts({printable: false});
        }
    });
    
    function addToOpts(opts, wholeLocation) {
        wholeLocation = wholeLocation || getLocation();
        var oldopts = getOpts(wholeLocation);
        opts = $.extend(oldopts, opts);
        setLocation(wholeLocation, opts);
    }

    function changeLoginForm(isLogged) {
        if (isLogged) {
            $('.hide-until-logged').show();
            $('.hide-when-logged').hide();
            $('#of-login-form').removeClass('login');
            $('#of-login-form').addClass('logout');
        } else {
            $('.hide-until-logged').hide();
            $('.hide-when-logged').show();
            $('#of-login-form').removeClass('logout');
            $('#of-login-form').addClass('login');
        }
    }

    function checkIfLogged(cb) {
        if (typeof cb != 'function') {
            cb = function () {};
        }
        $.get('/isLogged', function (data) {
            cb(data.isLogged || false);
            changeLoginForm(data.isLogged || false);
        });
    }

    checkIfLogged(function (result) {
        session.logged = result;
        initLogin();
    });
    
    $inspector.hide();
    $pernode.hide();

    function initLogin() {
        $('#of-login-form-in form').ajaxForm({
            success: function (data) {
                if (data && data.success && data.success === true) {
                    session.logged = true;
                    changeLoginForm(true);
                }
            }
        });
        $('#of-login-form-out form').ajaxForm({
            success: function (data) {
                if (data && data.success && data.success === true) {
                    session.logged = false;
                    changeLoginForm(false);
                }
            }
        });
    }

    function loadDocs() {
        $('#of-org-form-svg').empty();
        $('.othersvg').remove();
        $('.value', $inspector).empty();
        $inspector.removeClass('filled');
        $('#of-filter-options').hide();
        $('#of-docs-options').show();
        $('#subtitle').hide();
        $inspector.hide();
        $('#of-edit-plain').hide();
        $.get('/doclist', function (data) {
            $dlist.empty();
            if (data.org) {
                $('#title').html(data.org);
                $('title').html('Org Chart: ' + data.org);
            } else {
                $('#title').html('Org Chart');
                $('title').html('Org Chart');
            }
            if (data.orglogo) {
                $('#of-org-logo img').attr('src', data.orglogo);
            }
            docs = data.list;
            $('#of-new-doc').click(function () {
                var $dcc = $docctpl.clone();
                var $dcfrm = $('form', $dcc);
                $('.of-doc-date', $dcc).datepicker({dateFormat: 'yy-mm-dd'});

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

            for (var dx in docs) {
                var doc = docs[dx];
                var $doc = $doctpl.clone();
                $doc.attr('id', 'of-doc-box-for-' + doc._id);
                var isLogged = session.logged || false;

                var $renameForm = $('form', $doc);
                $renameForm.attr('action', '/renamedoc/' + doc._id);
                $renameForm.ajaxForm({
                    success: function (data) {
                        if (data && data.success && data.success !== false) {
                            var $tdoc = $('#of-doc-box-for-' + data.docid);
                            var $dname = $('.of-doc-title', $tdoc);
                            $dname.html(data.name);
                            $('.of-doc-rename', $tdoc).hide();
                            $dname.show();
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
                        $this.hide();
                        var $namein = $('.of-doc-rename', $this.closest('.of-doc-box'));
                        $namein.val($this.html());
                        $namein.show();
                        $namein.focus();
                        $namein.select();
                    }
                });

                if (!doc.count) {
                    doc.count = 0;
                }
                $('.of-doc-number', $doc).html(doc.count);
                var rdate = new Date(doc.date);
                var ddate = new Date(doc.created-0);
                $('.of-doc-created', $doc).html(ddate.toDateString() + ' at ' + ddate.toTimeString());
                if (!isNaN(rdate.getTime())) {
                    $('.of-doc-date', $doc).html(rdate.toDateString());
                } else {
                    $('.of-doc-date', $doc).closest('p').hide();
                }
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
            $dlist.show();
        });
    }

    function loadDoc(docid, zoomlevel) {
        var isHighlighted = null;
        var $orgchart = $('div#of-org-form-svg');
        if ($orgchart && $orgchart.length) {
            $orgchart.empty();
            $('.othersvg').remove();
        }
        $units.empty();
        
        $('#of-docs-options').hide();
        $('#of-edit-plain').hide();
        $('#of-filter-options').show();
        $dlist.hide();

        $.get('/list/' + docid, function (data) {
            if (data.org) {
                $('#title').html(data.org);
                $('title').html('Org Chart: ' + data.org);
            } else {
                $('#title').html('Org Chart');
                $('title').html('Org Chart');
            }
            if (data.orglogo) {
                $('#of-org-logo img').attr('src', data.orglogo);
            }
            if (data.doc) {
                $('#subtitle h2').html(data.doc);
                $('#subtitle').show();
                $('title').html($('title').html() + ' - ' + data.doc);
            } else {
                $('#subtitle').hide();
            }
            units = data.units;
            locs = data.colors;
            loccodes = data.codes;
            for (var nx in data.list.none) {
                addTo($units, units[data.list.none[nx]], data.list, units);
            }

            var $root = $units;

            if (zoomlevel && zoomlevel != null) {
                $root = $('#'+zoomlevel);
            }
        
            createOrgChart({
                orig: $root,
                lccolors: loccodes || {},
                height: 65,
                size: 200,
                click: function (node, id, svg) {
                    var oldid = id.substr(4);
                    $('.value', $inspector).html('');
                    $inspector.data('oldid', oldid);
                    $inspector.show();
                    $pernode.show();
                    $uev.removeClass('filled');
                    $uev.empty();
                    var $ob = $('#' + oldid);
                    var $on = $('.of-unit-view', $ob); // old node
                    var fieldcount = 0;
                    for (var fx in fields) {
                        var f = fields[fx];
                        var $ov = $('.of-unit-'+f, $on);
                        var $ofi = $('#of-inspector-' + f);
                        if ($ov && $ov.html().length) {
                            fieldcount += 1;
                            $ofi.show();
                            $('.value', $ofi).html($ov.html());
                        } else {
                            $ofi.hide();
                        }
                    }
                    var $itt = $('#of-inspector-type-tag');
                    $itt.show();
                    $itt.removeClass('employee').removeClass('contractor').removeClass('vacancy');
                    if ($ob.hasClass('employee')) {
                        $itt.addClass('employee');
                    } else if ($ob.hasClass('contractor')) {
                        $itt.addClass('contractor');
                    } else {
                        $itt.addClass('vacancy');
                    }
                    
                    if (isHighlighted && isHighlighted != null) {
                        svg.remove(isHighlighted);
                        isHighlighted = null;
                    }
                    
                    var lineg = svg.getElementById('lines-to-' + id);
                    if (lineg && lineg != null) {
                        var linesg = lineg.parentNode;
                        var clineg = svg.clone(linesg, lineg)[0];
                        isHighlighted = clineg;
                        svg.change(clineg, {fill: 'none', stroke: 'yellow', strokeWidth: '2'});
                    }
                    $('#of-inspector').addClass('filled');
                }
            });
            
            svg = $('#of-org-form-svg').svg('get');
            
            $('#of-search-box').keyup(function() {
                if (svg !== null) {
                    findAndHighlight(svg, this.value);
                }
            });
        });
    }
    
    function loadEditPlain(docid) {
        $('body').addClass('hidden-details');
        $('#of-documents-list').hide();
        $('#of-org-form-svg').empty();
        $('.othersvg').remove();
        var $frm = $('#of-edit-plain form');
        $frm.attr('action', '/plainupload/'+docid);
        $('textarea[name=text]').empty();
        $.get('/plaintext/'+docid, function (data) {
            $('textarea[name=text]').html(data.text);
            $('#of-edit-plain').show();
        });
        $frm.ajaxForm({
            dataType: 'json',
            success: function (data) {
                if (data && data.success === true) {
                    setLocation(getLocation());
                    $('body').removeClass('hidden-details');
                }
            }
        });
        $('button[type=cancel]', $frm).click(function () {
            setLocation(getLocation());
            $('body').removeClass('hidden-details');
            return false;
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
            var isVacant = false;
            if (data.end) {
                var enddate = new Date(data.end);
                if (!isNaN(enddate.getTime()) && enddate.getTime() < (new Date()).getTime()) {
                    isVacant = true;
                }
            }
            if (!isVacant && data.start) {
                var stdate = new Date(data.start);
                if (!isNaN(stdate.getTime()) && stdate.getTime() > (new Date()).getTime()) {
                    isVacant = true;
                }
            }
            if (!data.name || data.name == '' || isVacant) {
                $tc.addClass('vacancy');
                isVacant = true;
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
            if (!isVacant) {
                $('p.of-unit-name', $tc).html(data.name);
            }

            if (data.reqn && data.reqn != '' && !isVacant) {
                $('span.of-unit-reqn', $tc).html(data.reqn);
            } else {
                $('.of-unit-details', $tc).addClass('noreqn');
            }
            if (data.start && data.start != '' && !isVacant) {
                $('span.of-unit-start', $tc).html(data.start);
            }
            if (data.end && data.end != '' && !isVacant) {
                $('span.of-unit-end', $tc).html(data.end);
            }
            if (data.hours && data.hours != '') {
                $('span.of-unit-hrs', $tc).html(data.hours);
                if (data.hours-0 < 16) {
                    $tc.addClass('veryparttime');
                } else if (data.hours-0 < 32) {
                    $tc.addClass('parttime');
                } else {
                    $tc.addClass('fulltime');
                }
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

            if (data.location && data.location != '' && $tc.hasClass('employee')) {
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
                    $locc.hide();
                }
                $loc.html(data.location);
                var loccode = '';
                if (data.loccode && data.loccode != '') {
                    loccode = data.loccode.slice(0,2);
                } else {
                    $locc.hide();
                }
                $locc.html(loccode);

                $('input.of-unit-loc', $tc).attr('value', data.location);
                $('input.of-unit-lc', $tc).attr('value', loccode);
            } else {
                $loc.parent('p').hide();
                $locc.hide();
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

    function navigateToCurrent() {
        var curloc = getLocation();
        if (curloc[0] == '') {
            loadDocs();
        } else {
            if (curloc[1] == '') {
                loadDoc(curloc[0]);
                $('#of-zoom-out').attr('disabled', 'disabled');
            } else {
                loadDoc(curloc[0], curloc[1]);
                $('#of-zoom-out').removeAttr('disabled');
            }
        }
        if (curloc.length > 2) {
            var loadopts = getOpts(curloc);
            if ('sideways' in loadopts) {
                if (loadopts.sideways === true) {
                    $('#of-display-sideways').attr('checked', 'checked');
                } else if (loadopts.sideways === false) {
                    $('#of-display-sideways').removeAttr('checked');
                }
            }
            if ('printable' in loadopts) {
                if (loadopts.printable === true) {
                    $('#of-display-printable').attr('checked', 'checked');
                } else if (loadopts.printable === false) {
                    $('#of-display-printable').removeAttr('checked');
                }
            }
        }
    }

    $(window).hashchange(navigateToCurrent);
    $(window).hashchange();
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

    var qopts = getOpts();
    var $orig = $('#of-org-form');

    var fullOpts = $.extend({orig: $orig,
                            size: 300,
                            padding: 25,
                            height: 100,
                            draw: doNode,
                            sideways: true}, opts, qopts);
    if (fullOpts.printable) {
        fullOpts.maxDepth = 3;
    }

    $(function() {
        var $svg = $('#of-org-form-svg');
        $svg.svg('destroy');
        $svg.empty();
        $('.othersvg').remove();
        var sw = opts.sideways;
        $svg.attr(sw ? 'height' : 'width', 10);
        $svg.attr(sw ? 'width' : 'height', 10);
        $svg.svg({onLoad: function (svg) {
            drawInitial(svg, fullOpts);
        }});
    });
                            
    function makeTextFit(w, g, title, opts) {
        var txt = w.text(g, title, opts);
        var idealSize = fullOpts.size - 30 - fullOpts.padding;
        var bbox = txt.getBBox();
        var tw = bbox.width;
        while (tw > idealSize) {
            title = title.substr(0, (title.length * (idealSize / txt.getBBox().width)) - 3) + '...';
            w.remove(txt);
            txt = w.text(g, title, opts);
            bbox = txt.getBBox();
            tw = bbox.width;
        }
        return txt;
    }
                                
    function doNode(w, ng, $nc) {
        var title = $('.of-unit-title', $nc).html();
        var name = $('.of-unit-name', $nc).html();
        var location = $('.of-unit-loc', $nc).html();
        var textClass = 'of-node-text';

        var loccode = $('.of-unit-lc', $nc).html();
        var lcc = opts.lccolors[loccode] || opts.lccolors.other || 'grey';

        var id = $nc.attr('id');
        if (id && id != '') {
            ng.id = 'svg-' + id;
        }

        if (title && title != '') {
            var titleg = w.group(ng);
            var txt = makeTextFit(w, titleg, title, {class: textClass});
            var rct = w.rect(titleg, 0, -txt.getBBox().height+5, 0, 0, {fill: 'none', stroke: 'none', opacity: '0.4'});
            w.change(rct, {width: txt.getBBox().width, height: txt.getBBox().height});
        }

        if (name && name != '') {
            var nameg = w.group(ng, {transform: 'translate(0, 30)'});
            if (name.length > 30) {
                name = name.substr(0,35)+'...';
            }
            var txt = makeTextFit(w, nameg, name, {class: textClass});
            var rct = w.rect(nameg, 0, -txt.getBBox().height+5, 0, 0, {fill: 'none', stroke: 'none', opacity: '0.4'});
            w.change(rct, {width: txt.getBBox().width, height: txt.getBBox().height});
        }

        if (loccode && loccode != '') {
            var lcg = w.group(ng, {transform: 'translate(' + (opts.size - 50) + ' -40)'});
            w.rect(lcg, 0, 0, 30, 40, {fill: lcc});
            var lctg = w.group(lcg);
            var txt = w.text(lctg, loccode.substr(0,2), {fill: 'white', class: textClass});
            var rct = w.rect(lctg, 0, -txt.getBBox().height+5, 0, 0, {fill: 'none', stroke: 'none', opacity: '0.4'});
            w.change(rct, {width: txt.getBBox().width, height: txt.getBBox().height});
            var newx = (lcg.getBBox().width - lctg.getBBox().width) / 2;
            var newy = (lctg.getBBox().height - 2);
            w.change(lctg, {transform: 'translate('+newx+' '+newy+')'});
        }
    }

    function drawInitial(svg, fullOpts) {
        svg.graph.noDraw()
            .type('orgchart')
            .options(fullOpts)
            .redraw();
            
        if (fullOpts.printable) {
            var $childNodes = fullOpts.orig.children("li:first");
            var level = 1;
            var newFOpts = $.extend(fullOpts, {printable: false});
            while ($childNodes && $childNodes.length) {
                if ((level) % fullOpts.maxDepth === 0) {
                    $.each($childNodes, function () {
                        var $this = $(this);
                        if ($this.children('ul:first').children('li').length == 0) {
                            return true;
                        }
                        var tfOpts = $.extend(newFOpts, {orig: $(this)});
                        var $oldsvg = $('#of-org-form-svg');
                        var $newsvg = $('<div></div').addClass('othersvg');
                        $oldsvg.after($newsvg);
                        $newsvg.svg({onLoad: function (svg) {
                            drawInitial(svg, tfOpts);
                        }});
                    });
                }
                level += 1;
                $ncn = [];
                $.each($childNodes, function () {
                    var $this = $(this);
                    var $cn = $this.children('ul:first').children('li');
                    $cn.each(function () {
                        $ncn.push(this);
                    });
                });
                $childNodes = $ncn;
            }
        }

        var md = document.getElementById('of-main-display');
        var $svg = $('#of-org-form-svg');
        md.scrollTop = (($svg.outerHeight() - $(md).outerHeight() + fullOpts.height) / 2);
    }
}
