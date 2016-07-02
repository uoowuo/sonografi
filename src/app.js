/**
 * Sonografi, v1.0.0
 *
 * Description: Audio visualizer webapp made of ES2015 and WebGL.
 * License: GPLv3 http://www.gnu.org/licenses/gpl-3.0.html
 *
 * @todo implement, remove stray debugger statements, add sane debugging
 * @todo module testing all the things
 * @todo testing on mobile and with low traffic, no cache
 * @todo FF memleak?
 */

import Shims from './classes/shims';
import Sonografi from './classes/sonografi';

  ///////////////////////
 // Application start //
///////////////////////
(function (globals) {

    'use strict';

    // Apply shims
    // @todo replace with modernizr
    Shims.preventConsoleErrors();
    Shims.forEachPolyfill();

    // Start the application
    document.addEventListener('DOMContentLoaded', function (event) {

        var canvas = document.querySelector('canvas#demo-scene');

        // Start a new visualizer
        // To access application state for debugging, start at window.sonografi top level object
        globals.sonografi = new Sonografi(canvas);

        // Adjust viewport on window resize
        window.addEventListener('resize', function () {
            sonografi.viewport.refit();
        });
        window.addEventListener('orientationchange', function () {
            sonografi.viewport.refit();
        });
    });

}(self));