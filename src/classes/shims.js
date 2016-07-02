/**
 * Contains shims & polyfills.
 */
class Shims {

    /**
     * Prevents console errors in browsers that lack a console.
     */
    static preventConsoleErrors () {
        
        var method;
        var noop = function () {};
        var methods = [
            'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
            'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
            'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
            'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
        ];
        var length = methods.length;
        var console = (window.console = window.console || {});

        while (length--) {
            method = methods[length];

            // Only stub undefined methods.
            if (!console[method]) {
                console[method] = noop;
            }
        }
    }

    /**
     * forEach polyfill.
     */
    static forEachPolyfill () {
        
        var forEach = function (fn, scope) {
            'use strict';
            var i, len;
            for (i = 0, len = this.length; i < len; ++i) {
                if (i in this) {
                    fn.call(scope, this[i], i, this);
                }
            }
        };
        if (! Array.prototype.forEach) Array.prototype.forEach = forEach;
    }
}

export default Shims;


  