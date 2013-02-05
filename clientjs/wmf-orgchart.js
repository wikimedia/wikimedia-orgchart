var filters = ['vacancy', 'contractor', 'employee', 'noreqn'];

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
    var found = false;
    $('.of-node-text').each(function () {
        w.change(this.nextSibling, {fill: 'none'});
        if (str == '') {
            return;
        }
        if (this.textContent.toLowerCase().indexOf(str.toLowerCase()) != -1) {
            w.change(this.nextSibling, {fill: 'yellow'});
            if (found === false) {
                found = true;
                var pg = this.parentNode.parentNode.parentNode; // hackish, but it is (sort of) guaranteed to work
                var offtop = $(pg).offset().top;
                var ofmd = $('#of-main-display').get(0);
                if (offtop < 0 || offtop > ofmd.clientHeight) {
                    ofmd.scrollTop += offtop;
                }
            }
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
    var $export = $('#of-export-current');
    var $docctpl = $('.of-doc-create').detach();
    var $inspector = $('#of-inspector');
    var $pernode = $('#of-zoom-here').add($('#of-zoom-here').next());
    var fields = ['name', 'title', 'loc', 'lc', 'reqn', 'start', 'end', 'hrs', 'notes', 'pay'];
    var $uev = $('#of-edit-viewport');
    var session = {};
    var $units = $('#of-org-form');
    var units = {};
    var locs = {};
    var loccodes = {};
    var svg = null;

    var $placeholders = $('#of-username, #of-search-box, #of-password');
    $placeholders.focus(function () {
        var $this = $(this);
        $this.addClass('edittime');
    });

    $placeholders.blur(function () {
        var $this = $(this);
        if ($this.val() == '') {
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

    $('#of-create-user').click(function ( e ) {
        e.stopPropagation();
        e.preventDefault();
        window.location.pathname = '/usercreate';
        return 0;
    });

    $('#of-add-report').click(function () {
        $inspector.hide();
        $uev.addClass('filled');
        $uev.html($ucreate.clone());
        var $form = $('form', $uev);
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
        $form.attr('action', '/addto/'+getDocId()+'/'+unitid);
        $('.of-unit-hours', $form).val('40');
        $('.of-unit-reqn', $form).val('999');
        $('input[name=end]', $form).datepicker({dateFormat: 'yy-mm-dd'});
        $('input[name=start]', $form).datepicker({dateFormat: 'yy-mm-dd'});
        $form.ajaxForm({
            success: function (data) {
                $uev.removeClass('filled');
                $uev.empty();
                if (data && data.unit) {
                    addToOpts({selected: 'of-unit-box-for-' + data.unit[0]._id});
                } else {
                    setLocation(getLocation());
                }
            }
        });
        $('.of-unit-cancel-edit', $form).click(function () {
            $uev.removeClass('filled');
            $uev.empty();
            $inspector.show();
            $('#of-inspector-change-super').hide();
            $('#of-inspector-change-order').hide();
        });
    });

    $('#of-edit-node').click(function () {
        $inspector.hide();
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
                addToOpts({selected: oldid});
            }
        });
        $('.of-unit-cancel-edit', $form).click(function () {
            $uev.removeClass('filled');
            $uev.empty();
            $inspector.show();
            $('#of-inspector-change-super').hide();
            $('#of-inspector-change-order').hide();
        });
    });

    $('#of-change-super').click(function () {
        $('#of-inspector-change-super').show();
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
        $('.svg-orgchart-node').on('of-super-change', function () {
            var id = this.id;
            var ocidlist = id.split('-');
            var nodeid = ocidlist[ocidlist.length-1];
            var $form = $('#of-form-change-super').clone();
            $('.svg-orgchart-node').off('of-super-change');
            $('input', $form).val(nodeid);
            $form.attr('action', '/modify/' + getDocId() + '/' + unitid);
            $form.ajaxForm({
                success: function (data) {
                    $('#of-inspector-change-super').hide();
                    if (data && data.unit) {
                        addToOpts({selected: nodeid});
                    } else {
                        setLocation(getLocation());
                    }
                }
            });
            $form.submit();
            return true;
        });
    });

    $('#of-change-order').click(function () {
        $('#of-inspector-change-order').show();
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
		var unitNode = $( '#svg-of-unit-box-for-' + unitid ).get( 0 );
		var groupNode = unitNode.parentNode.parentNode.parentNode;
		var childNodes = groupNode.getElementsByClassName( 'svg-orgchart-node-movement' );
		var node;
		for ( var nx in childNodes ) {
			node = childNodes[nx];
			node.setAttribute( 'class', node.getAttribute( 'class' ) + ' mode-active' );
			$( node ).on('of-order-change', function () {
				var order = this.getAttribute( 'data-index' ) - 1;
				var $form = $('#of-form-change-order').clone();
				$('.svg-orgchart-node-movement')
					.removeClass( 'mode-active' )
					.off('of-order-change');
				$('input', $form).val( order );
				$form.attr('action', '/modify/' + getDocId() + '/' + unitid);
				$form.ajaxForm({
					success: function (data) {
						$('#of-inspector-change-order').hide();
						addToOpts({selected: unitid});
					}
				});
				$form.submit();
				return true;
			});
		}
    });

    $('#of-cancel-super-change').click(function () {
        $('#of-inspector-change-super').hide();
        $('.svg-orgchart-node').off('of-super-change');
    });

    $('#of-cancel-order-change').click(function () {
        $('#of-inspector-change-order').hide();
        $('.svg-orgchart-node-movement').off('of-order-change');
    });

    $('#of-delete-node').click(function () {
        $uev.addClass('filled');
        $uev.html($udelete.clone());
        $inspector.hide();
        var $form = $('form', $uev);
        var oldid = $inspector.data('oldid');
        var unitid = oldid.substr(16);
        $form.attr('action', '/remove/'+getDocId()+'/'+unitid);
        $form.ajaxForm({
            success: function () {
                $uev.removeClass('filled');
                $uev.empty();
                $inspector.find('.value').empty();
                setLocation(getLocation());
            }
        });
        $('.of-unit-remove-node-cancel', $uev).click(function () {
            $uev.removeClass('filled');
            $uev.empty();
            $inspector.show();
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

    $.each(filters, function (i, f) {
        $('#of-filter-'+f).click(function () {
            var $this = $(this);
            var newOpts = {};
            if ($this.is(':checked')) {
                newOpts[f] = true;
                addToOpts(newOpts);
            } else {
                newOpts[f] = false;
                addToOpts(newOpts);
            }
        });
    });

    function addToOpts(opts, wholeLocation) {
        wholeLocation = wholeLocation || getLocation();
        var oldopts = getOpts(wholeLocation);
        opts = $.extend(oldopts, opts);
        if (wholeLocation.length > 2) {
            delete wholeLocation[2];
        }
        setLocation(wholeLocation, opts);
    }

    function changeLoginForm(isLogged) {
        if (isLogged) {
            if (session.user && session.user.canEditNodes) {
                $('.hide-until-can-edit-nodes').show();
            }
            if (session.user && session.user.canEditDocs) {
                $('.hide-until-can-edit-docs').show();
            }
            if (session.user && session.user.canCreateUsers) {
                $('#of-create-user').show();
            } else {
                $('#of-create-user').hide();
            }
            $('.hide-when-logged').hide();
            $('#of-login-form').removeClass('login');
            $('#of-login-form').addClass('logout');
            $('#of-current-user').html(session.user.username);
        } else {
            $('.hide-until-can-edit-nodes').hide();
            $('.hide-until-can-edit-docs').hide();
            $('.hide-when-logged').show();
            $('#of-login-form').removeClass('logout');
            $('#of-login-form').addClass('login');
        }
    }

    var showLoginError = ( function () {
        var errorTimeout = null;
        return function () {
            $( '#of-password' ).val( '' );
            var $error = $( '#of-login-error' );
            $error.html( 'Username or password not recognized.' );
            if ( errorTimeout !== null ) {
                clearTimeout( errorTimeout );
            }
            errorTimeout = setTimeout( function () {
                errorTimeout = null;
                $error.empty();
            }, 2000 );
        };
    } )();

    function checkIfLogged(cb) {
        if (typeof cb != 'function') {
            cb = function () {};
        }
        $.get('/isLogged', function (data) {
            cb(data.isLogged || false, data.user || null);
            changeLoginForm(data.isLogged || false);
        });
    }

    checkIfLogged(function (result, user) {
        session.logged = result;
        session.user = user;
        session.username = user ? user.name : '';
        initLogin();
    });

    $inspector.hide();
    $pernode.hide();
    $pernode.addClass('hidden-btn');

    function initLogin() {
        $('#of-login-form-in form').ajaxForm({
            beforeSerialize: function ( $form ) {
                var $un = $( 'input[name="username"]' );
                // If the username is one of the defaults, we don't mess with it.
                var $pw = $( 'input[name="password"]' );
                var shaObj = new jsSHA( $pw.val(), 'ASCII' );
                var hash = shaObj.getHash( 'SHA-512', 'HEX' );
                $pw.val( hash );
            },
            success: function (data) {
                if (data && data.success && data.success === true) {
                    session.logged = true;
                    session.username = data.user.username;
                    session.user = data.user;
                    changeLoginForm(true);
                } else {
                    showLoginError();
                }
            }
        });
        $('#of-login-form-out form').ajaxForm({
            success: function (data) {
                if (data && data.success && data.success === true) {
                    session.logged = false;
                    delete session.username;
                    changeLoginForm(false);
                }
            }
        });
    }

    function loadDocs() {
        $('#of-org-form-svg').empty();
        $('.othersvg').remove();
        $('.value', $inspector).empty();
        $('#of-inspector-img img').attr('src', 'placeholder');
        $inspector.removeClass('filled');
        $('#of-filter-options').hide();
        $('#of-docs-options').show();
        $('#subtitle').hide();
        $inspector.hide();
        $('#of-edit-plain').hide();
        $pernode.hide();
        $pernode.addClass('hidden-btn');
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

            var canEditDocs = ( session.logged || false ) && session.user && session.user.canEditDocs;
            var dlist = new DocList( canEditDocs, docs, $dlist, function () {
                var docid = $( this ).attr( 'data-docid' );
                setLocation([docid]);
            } );

            $('#of-new-doc').click(function () {
                $.post( '/newdoc', { name: 'New Document' }, function ( data ) {
                    if ( data && data.success ) {
                        dlist.addDoc( $( '#of-documents-list tr' ).length, data.doc, dlist.listView.addItem() );
                    }
                } );
            });

            var $orgchart = $('div.jOrgChart');
            if ($orgchart && $orgchart.length) {
                $orgchart.empty();
            }
            $dlist.show();
            checkIfLogged();
        });
    }

    function loadDoc(docid, zoomlevel) {
        var isHighlighted = [];
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
                height: 60,
                size: 200,
                click: function (node, id, svg) {
                    if ($(node).triggerHandler('of-super-change') !== undefined) {
                        return false;
                    }
                    var oldid = id.substr(4);
                    $('.value', $inspector).html('');
                    var $img = $('img', $inspector);
                    $img.attr('src', 'placeholder');
                    $img.hide();
                    $inspector.data('oldid', oldid);
                    $inspector.show();
                    $('#of-inspector-change-super').hide();
                    $('#of-inspector-change-order').hide();
                    $pernode.show();
                    $pernode.removeClass('hidden-btn');
                    $uev.removeClass('filled');
                    $uev.empty();
                    var $ob = $('#' + oldid);
                    var $on = $('.of-unit-view', $ob); // old node
                    var fieldcount = 0;
                    for (var fx in fields) {
                        var f = fields[fx];
                        var $ov = $('.of-unit-'+f, $on);
                        var $ofi = $('#of-inspector-' + f);
                        if ($ov.length && $ov.html().length) {
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
                        $('#of-inspector-loc').hide();
                    }
                    var imgurl = $('.of-unit-img', $ob).html();
                    if (imgurl && imgurl != '') {
                        $img.attr('src', imgurl);
                        $img.show();
                    } else {
                        $img.hide();
                    }

                    for (var ix in isHighlighted) {
                        svg.remove(isHighlighted[ix]);
                        delete isHighlighted[ix];
                    }

                    var lineg = svg.getElementById('lines-to-' + id);
                    while (lineg && lineg != null) {
                        var linesg = lineg.parentNode;
                        var parentid = linesg.id.substr(11);
                        var clineg = svg.clone(linesg, lineg)[0];
                        isHighlighted.push(clineg);
                        svg.change(clineg, {fill: 'none', stroke: 'yellow', strokeWidth: '2'});
                        lineg = svg.getElementById('lines-to-' + parentid);
                    }
                    $('#of-inspector').addClass('filled');
                    var offtop = $(node).offset().top;
                    var realheight = $('rect').get(0).height.baseVal.value;
                    var ofmd = $('#of-main-display').get(0);
                    if (offtop < 0) {
                        ofmd.scrollTop += offtop;
                        ofmd.scrollTop -= ofmd.clientHeight / 2;
                    } else if (offtop + realheight > ofmd.clientHeight) {
                        ofmd.scrollTop += offtop + realheight;
                        ofmd.scrollTop -= ofmd.clientHeight / 2;
                    }
                }
            });

            var loadOpts = getOpts();
            if ('selected' in loadOpts) {
                var selected = $('#svg-' + loadOpts.selected);
                if (selected.length) {
                    selected.click();
                }
            }

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

            if (data.image && data.image != '' && !isVacant) {
                $('.of-unit-img', $tc).html(data.image);
            }

            if (data.reqn && data.reqn != '') {
                $('span.of-unit-reqn', $tc).html(data.reqn);
            } else {
                $tc.addClass('noreqn');
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
            if (data.notes && data.notes != '') {
                $('span.of-unit-notes', $tc).html(data.notes);
            }
            // We have temporarily disabled the compensation stuff in the UI.
            // TODO figure out the right way to do this; Erik is still thinking.
            if (data.pay && data.pay != '' && false) {
                $('span.of-unit-pay', $tc).html(data.pay);
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
            var location = data.location || '';

            if (location != '') {
                $loc.html(location);
                if (locs[location]) {
                    $loc.css('color', locs[location]);
                } else {
                    $loc.css('color', locs.other);
                }
            } else {
                $loc.parent('p').hide();
            }

            var $locc = $('span.of-unit-lc', $tc);
            var loccode = data.loccode || '';

            if (loccode != '') {
                $locc.html(loccode.slice(0,2));
                if (loccodes[loccode]) {
                    $locc.css('background-color', loccodes[loccode]);
                } else {
                    $locc.css('background-color', loccodes.other);
                }
            } else {
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
            $.each(filters, function (i, f) {
                if (f in loadopts) {
                    if (loadopts[f] === true) {
                        $('#of-filter-'+f).attr('checked', 'checked');
                    } else if (loadopts[f] === false) {
                        $('#of-filter-'+f).removeAttr('checked');
                    }
                }
            });
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
							drawGroup: setUpNodeGroup,
                            shouldRender: shouldRender,
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
            var cursvg = $svg.get(0).innerHTML;
            cursvg = cursvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
            cursvg = cursvg.replace(/ href="#outlinerect/g, ' xlink:href="#outlinerect');
            $('#of-export-current').attr( 'href-lang', 'image/svg+xml;base64' );
            $('#of-export-current').attr( 'href', 'data:image/svg+xml;base64,' + Base64.encode( cursvg ) );
        }});
    });

    function makeTextFit(txt, len) {
        len = len || 26;
        if (txt.textContent.length > len) {
            txt.textContent = txt.textContent.substr(0, len-3) + '...';
        }
    }

    function shouldRender($node) {
        var $nc = $node.clone()
            .children("ul,li")
            .remove()
            .end();
        var result = true;
        $.each(filters, function (i, f) {
            if (!$('#of-filter-' + f).is(':checked') && $nc.hasClass(f)) {
                result = false;
                return 0;
            }
        });
        return result;
    }

    function unentity( text ) {
        return $( '<div></div>' ).html( text ).text();
    }

	function setUpNodeGroup( w, groupg, level ) {
		w.change( groupg, { 'data-current-index': 0 } );
	}

    function doNode(w, nodeg, $node, level) {
        var $nc = $node.clone()
            .children("ul,li")
            .remove()
            .end();
        if ($nc.hasClass('noreqn')) {
            w.use(nodeg, '#outlinerect', {'stroke-dasharray': '5,5'});
        } else if ($nc.hasClass('vacancy')) {
            w.use(nodeg, '#outlinerect', {opacity: '0.5'});
        } else {
            w.use(nodeg, '#outlinerect');
        }
        var ng = w.group(nodeg, {transform: 'translate(14, 25)', 'font-size': 14, 'font-family': 'arial'});

        var supervisor = null;
        if (fullOpts.wasPrintable && level == 0) {
            var $super = $node.parent().closest('.of-unit-box').find('.of-unit-details');
            if ($super.length) {
                supervisor = $('.of-unit-name', $super).html();
                if (!supervisor || supervisor == '') {
                    supervisor = $('.of-unit-title', $super).html();
                }
            }
        }
        var title = unentity( $('.of-unit-title', $nc).html() );
        var name = unentity( $('.of-unit-name', $nc).html() );
        var location = unentity( $('.of-unit-loc', $nc).html() );
        var textClass = 'of-node-text';

        var loccode = unentity( $('.of-unit-lc', $nc).html() );
        var lcc = opts.lccolors[loccode] || opts.lccolors.other || 'grey';

        var id = $nc.attr('id');
        if (id && id != '') {
            nodeg.id = 'svg-' + id;
        }
        w.change(nodeg, {class: 'svg-orgchart-node'});

        var bb = {height: 16.75, width: fullOpts.size-10};

        if (supervisor && supervisor != null) {
            var superg = w.group(ng, {transform: 'translate(0, -30)', 'font-size': '8pt'});
            var txt = w.text(superg, 'Supervisor: ' + supervisor);
            makeTextFit(txt, 30);
        }

        if (title && title != '') {
            var titleg = w.group(ng);
            var txt = w.text(titleg, title, {class: textClass});
            makeTextFit(txt);
            var rct = w.rect(titleg, 0, -bb.height+5, 0, 0, {width: bb.width, height: bb.height, fill: 'none', stroke: 'none', opacity: '0.4'});
        }

        if (name && name != '') {
            var nameg = w.group(ng, {transform: 'translate(0, 16)', 'font-weight': 'bold'});
            var txt = w.text(nameg, name, {class: textClass});
            makeTextFit(txt);
            var rct = w.rect(nameg, 0, -bb.height+5, 0, 0, {width: bb.width, height: bb.height, fill: 'none', stroke: 'none', opacity: '0.4'});
        }

        if (loccode && loccode != '' && !$nc.hasClass('vacancy')) {
            var lcg = w.group(ng, {title: location, transform: 'translate(' + (opts.size - 50) + ' -45)'});
            w.rect(lcg, 0, 0, 22, 30, {fill: lcc});
            var lctg = w.group(lcg, {transform: 'translate(4 '+bb.height+')'});
            var txt = w.text(lctg, loccode.substr(0,2), {fill: 'white', class: textClass, 'font-size': '8pt'});
            var rct = w.rect(lctg, 0, -bb.height+5, 0, 0, {width: bb.width, height: bb.height, fill: 'none', stroke: 'none', opacity: '0.4'});
        }

        if ($nc.hasClass('vacancy')) {
            w.use(nodeg, '#outlinerect', {opacity: '0.5'});
        }

		var parentGroup = nodeg.parentNode.parentNode.parentNode;
		var currentIndex = parentGroup.getAttribute( 'data-current-index' ) - 0;
		var upChange = w.use( nodeg, 0, 0, null, null, '#order-change-up',
			{ 'data-index': currentIndex, class: 'svg-orgchart-node-movement' } );
		var downChange = w.use( nodeg, 0, 2 * fullOpts.height / 3, null, null, '#order-change-down',
			{ 'data-index': currentIndex + 1, class: 'svg-orgchart-node-movement' } );

		upChange.onclick = function ( event ) {
			if ( $( this ).triggerHandler( 'of-order-change') !== undefined ) {
				event.stopPropagation();
				event.preventDefault();
				return false;
			}
		};
		downChange.onclick = upChange.onclick;

		w.change( parentGroup, { 'data-current-index': currentIndex + 1 } );
    }

    function drawInitial(svg, fullOpts) {
        svg.graph.noDraw()
            .type('orgchart')
            .options(fullOpts)
            .redraw();
        if (fullOpts.printable) {
            var $childNodes = fullOpts.orig.children('li:first');
            if ($childNodes.length == 0) {
                $childNodes = fullOpts.orig;
            }
            var level = 1;
            var newFOpts = $.extend(fullOpts, {printable: false, wasPrintable: true});
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
