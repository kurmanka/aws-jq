aws-jq
======

This is a prototype-stage (i.e. very early) experimental jquery-like 
library wrapper around the AWS SDK for node.js:
 - http://aws.amazon.com/sdkfornodejs/ 
 - https://github.com/aws/aws-sdk-js

The API is inspired by jQuery (https://github.com/jquery/jquery), 
and here is some theoretical context:
 - http://en.wikipedia.org/wiki/Method_chaining
 - http://en.wikipedia.org/wiki/Fluent_interface
 - http://en.wikipedia.org/wiki/Command-query_separation

Chaining callbacks uses some ideas from https://github.com/kriskowal/q

The idea is to be able to do something like this:

```javascript
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


(c) 2013, Ivan Kurmanov
