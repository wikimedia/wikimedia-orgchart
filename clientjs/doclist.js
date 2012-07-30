( function ( $ ) {
    DocList = function ( canEdit, docs, $container, fnChoose, fnRename ) {
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
        var $delete = $( '<img src="placeholder" alt="Delete" />' );
        $delete.addClass( 'hide-until-can-edit-docs' );
        $delete.addClass( 'delete-button' );
        $dactions.append( $delete );
        var $copy = $( '<img src="placeholder" alt="Copy" />' );
        $copy.addClass( 'hide-until-can-edit-docs' );
        $copy.addClass( 'copy-button' );
        $dactions.append( $copy );
        $tpl.append( $dactions );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-title' ) );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-nodes' ) );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-represent' ) );
        $tpl.append( $( '<td></td>' ).addClass( 'doc-created' ) );

        _this.fnChoose = fnChoose;
        _this.fnRename = fnRename;
        _this.canEdit = canEdit;
        _this.listView = new ListView( docs, $tpl, function ( i, item, $item ) {
            _this.fnAdd( i, item, $item );
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
                    alt: isBeingDeleted ? 'Undelete' : 'Delete'
                    // TODO: Change src here when image(s) are ready
                } );
            } );
        },

        copyDoc: function ( $row, cb ) {
            var _this = this;
            var $a = $( 'a[data-docid]' );
            $.post( '/copydoc', { name: $a.html(), docid: $a.attr( 'data-docid' ) }, function ( data ) {
                if ( data.success ) {
                    _this.fnAdd( $( '#of-documents-list tr' ).length, data.doc, _this.listView.addItem() );
                }
            });
        },

        fnAdd: function ( i, item, $item ) {
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

            if ( _this.canEdit ) {
                var $docrnlink = $( '<a href="javascript:">(rename)</a>' ).addClass( 'empty-doc-info' );
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
                        _this.fnRename( docid, $input.val(), function ( newname ) {
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
            }

            $( '.doc-nodes', $item ).html( item.count || 0 );

            var $docreps = $( '.doc-represent', $item );
            if ( !item.date || item.date == '' ) {
                item.date = '(none)';
                $docreps.addClass( 'empty-doc-info' );
            } else {
                var rdate = new Date( item.date );
                item.date = rdate.toDateString();
            }
            $docreps.html( item.date );

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
        }
    };
} )( jQuery );
