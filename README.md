aws-jq
======

This is a prototype-stage (i.e. very early) experimental jquery-like 
library wrapper around the AWS SDK for node.js:
 - http://aws.amazon.com/sdkfornodejs/ 
 - https://github.com/aws/aws-sdk-js
 - http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html

The idea is to be able to do something like this:

```javascript
var aws = require('aws-jq/api.js').aws;

// setup AWS config
aws({region: 'us-east-1'});

// start an instance
aws('i-12345678').start();

// attach an EBS volume to an instance
aws('i-12345678').attach( 'vol-45671234', '/dev/sdd' );
// and detach()
aws('vol-45671234').detach();

// get instance's state
aws('i-12345678').get('State', function(state) {
  console.log('instance state:', state);
});

// get volume's size
aws('vol-45671234').get('Size', function(s) {
  console.log('volume size:', s);  
});
```

But also to be able to chain the action-methods, and mix 
them with your own code.

```javascript
aws('i-12345678')
  .start()
  .get('PublicIpAddress','PrivateIpAddress', function(ip,privateip,next) {
    console.log('public ip:',  ip);
    console.log('private ip:', privateip);
    next();
  })
  .attach( 'vol-45671234', '/dev/sdd' )
  .then(function(s,f){
    console.log('started & drive attached');
    // do stuff
    // ...
    s(); // succes
  })
  .detach( 'vol-45671234' )
  .stop()
  .then(function(s,f){
    console.log('stopped');
    // do more stuff
    //...
    s(); // success
  })
  .then(function(s,f){
    console.log('all done');
    s(); 
  })
;
```

Background
==========

The API is inspired by jQuery (https://github.com/jquery/jquery), 
and here is some background theory:
 - http://en.wikipedia.org/wiki/Method_chaining
 - http://en.wikipedia.org/wiki/Fluent_interface
 - http://en.wikipedia.org/wiki/Command-query_separation

Chaining callbacks uses some ideas from https://github.com/kriskowal/q


License
=======

The MIT License (MIT)

Copyright (c) 2013, Ivan Kurmanov.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
