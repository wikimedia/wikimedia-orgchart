( function ( $ ) {
    DocList = function ( canEdit, docs, $container, fnChoose ) {
        var _this = this;

        var $tbl = $( '<table></table>' );
        $container.append( $tbl );
        var $thr = $( '<tr></tr>' );
        $tbl.append( $thr );

        $thr.append( $( '<th></th>' ).html( 'Actions' ) );
        $thr.append( $( '<th></th>' ).html( 'Title' ) );
        $thr.append( $( '<th></th>' ).html( 'Nodes' ) );
        $thr.append( $( '<th></th>' ).html( 'Represents' ) );
        $thr.append( $( '<th></th>' ).html( 'Created' ) );

        var $tpl = $( '<tr></tr>' );
        var $dactions = $( '<td></td>' ).addClass( 'doc-manage' );
        var $delete = $( '<img src="/image/delete.png" alt="Delete" title="Delete" />' );
        $delete.addClass( 'hide-until-can-edit-docs' );
        $delete.addClass( 'delete-button' );
        $dactions.append( $delete );
        var $copy = $( '<img src="/image/copy.png" alt="Copy" title="Copy" />' );
        $copy.addClass( 'hide-until-can-edit-docs' );
        $copy.addClass( 'copy-button' );
        $dactions.append( $copy );
        $tpl.append( $dactions );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-title' ) );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-nodes' ) );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-represent' ) );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-created' ) );

        _this.fnChoose = fnChoose;
        _this.canEdit = canEdit;
        _this.listView = new ListView( docs, $tpl, function ( i, item, $item ) {
            _this.addDoc( i, item, $item );
        }, $tbl );
    };

    DocList.prototype = {
        deleteDoc: function ( $row ) {
            var callout = '/deletedoc';
            var isBeingDeleted = !$row.hasClass( 'deleted' );
            if ( !isBeingDeleted ) {
                callout = '/undeletedoc';
            }
            $.post( callout, { docid: $( 'a[data-docid]', $row ).attr( 'data-docid' ) }, function ( data ) {
                if ( data.success ) {
                    $row.toggleClass( 'deleted' );
                }
                $( '.delete-button', $row ).attr( {
                    alt: isBeingDeleted ? 'Undelete' : 'Delete',
                    title: isBeingDeleted ? 'Undelete' : 'Delete',
                    src: isBeingDeleted ? '/image/undelete.png' : '/image/delete.png'
                } );
            } );
        },

        copyDoc: function ( $row, cb ) {
            var _this = this;
            var $a = $( 'a[data-docid]' );
            $.post( '/copydoc', { name: $a.html(), docid: $a.attr( 'data-docid' ) }, function ( data ) {
                if ( data.success ) {
                    _this.addDoc( $( '#of-documents-list tr' ).length, data.doc, _this.listView.addItem() );
                }
            });
        },

        addDoc: function ( i, item, $item ) {
            var _this = this;
            var $doctitle = $( '.doc-title', $item );
            var $doclink = $( '<a href="javascript:"></a>' );
            $doctitle.append( $doclink );
            if ( !item.name || item.name == '' ) {
                item.name = '(none)';
                $doctitle.addClass( 'empty-doc-info' );
            }
            $doclink.html( item.name );
            $doclink.attr( 'data-docid', item._id );
            $doclink.click( _this.fnChoose );

            var $docrnlink = $( '<a href="javascript:"></a>' ).addClass( 'empty-doc-info' );
            $docrnlink.html( item.name == '' ? '(name)' : '(rename)' );
            $docrnlink.click( function () {
                var $td = $( this ).closest( 'td' );
                var $a = $( 'a[data-docid]', $td );
                var curname = $a.html();
                var docid = $a.attr( 'data-docid' );
                $( 'a', $td ).hide();
                var $form = $( '<form></form>' );
                $td.append( $form );
                var $input = $( '<input type="text" />' );
                $input.val( curname );
                $form.append( $input );
                $input.focus();
                $input.select();
                $form.submit( function ( e ) {
                    e.stopPropagation();
                    _this.renameDoc( docid, $input.val(), function ( newname ) {
                        var $a = $( 'a[data-docid]', $td );
                        $a.html( newname );
                        $( 'a', $td ).show();
                        $form.remove();
                    } );
                    return false;
                } );
            } );
            $docrnlink.addClass( 'hide-until-can-edit-docs' );
            $doctitle.append( $docrnlink );

            $( '.doc-nodes', $item ).html( item.count || 0 );

            var $docreps = $( '.doc-represent', $item );
            if ( !item.date ) {
                item.date = '';
                $docreps.addClass( 'empty-doc-info' );
            } else {
                var rdate = new Date( item.date );
                item.date = rdate.toDateString();
            }
            $docreps.html( item.date );

            var $doccdlink = $( '<a href="javascript:"></a>' ).addClass( 'empty-doc-info' );
            $doccdlink.html( item.date == '' ? '(add date)' : '(change)' );
            $doccdlink.click( function () {
                _this.changeDocDate( $( this ).closest( 'td' ) );
            } );
            $doccdlink.addClass( 'hide-until-can-edit-docs' );
            $docreps.append( $doccdlink );
            
            var $doccreated = $( '.doc-created', $item );
            if ( !item.created || item.created == '' ) {
                item.created = '(none)';
                $doccreated.addClass( 'empty-doc-info' );
            } else {
                var ddate = new Date( item.created - 0 );
                item.created = ddate.toDateString() + ' at ' + ddate.toTimeString();
            }
            $doccreated.html( item.created );

            $( '.delete-button', $item ).click( function () {
                _this.deleteDoc( $( this ).closest( 'tr' ) );
            } );

            $( '.copy-button', $item ).click( function () {
                _this.copyDoc( $( this ).closest( 'tr' ) );
            } );
        },

        renameDoc: function ( docid, newname, finished ) {
            $.post( '/renamedoc/' + docid, { name: newname }, function ( data ) {
                finished( newname );
            } );
        },

        changeDocDate: function ( $td ) {
            var _this = this;
            var docid = $( 'a[data-docid]', $td.closest( 'tr' ) ).attr( 'data-docid' );
            var $tdtmp = $( '<td></td>' );
            var $dform = $( '<form></form>' );
            $tdtmp.append( $dform );
            var $din = $( '<input type="text" />' );
            $tdtmp.append( $din );
            $td = $td.replaceWith( $tdtmp );

            function finishDate() {
                var date = new Date( $din.val() ).getTime();
                $.post( '/changedocdate/' + docid, { date: date }, function ( data ) {
                    if ( data && data.success ) {
                        var $a = $( 'a', $td ).detach();
                        if ( data.date && data.date != '' ) {
                            date = new Date( data.date );
                            date = date.toUTCString().substr( 0, 16 );
                            $td.html( date );
                            $td.removeClass( 'empty-doc-info' );
                            $a.html( '(change)' );
                        } else {
                            $td.html( '' );
                            $td.addClass( 'empty-doc-info' );
                            $a.html( '(add date)' );
                        }
                        $a.click( function () {
                            _this.changeDocDate( $( this ).closest( 'td' ) );
                        } );
                        $td.append( $a );
                        $tdtmp.replaceWith( $td );
                    }
                } );
            }

            $dform.submit( finishDate );
            $din.datepicker( {
                dateFormat: 'yy-mm-dd',
                onSelect: finishDate
            } ).datepicker( 'show' );
        }
    };
} )( jQuery );
