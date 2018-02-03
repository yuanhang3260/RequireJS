### RequireJS

A simple implementation of RequireJS. It supports loading modules that are not
AMD compliant.

#### Implementation
RequireJS performs asynchronous module loading by dynamically creating <script>
tags in html from module dependencies, and attaching an onload event handler to
each of these script tags. This handler finalizes the load of this module, which
triggers a recursive backtrace to finish the load of upper level depending
modules.

#### Usage
Same as the standard RequireJS library, but without the complex features.
A simple example is given in index.html.

#### Issues
CommonJS style module is not supported yet.
