aws-jq
======

This is a very early-stage experimental jquery-like library-wrapper
around AWS SDK for node.js:
 - http://aws.amazon.com/sdkfornodejs/ 
 - https://github.com/aws/aws-sdk-js

Chaining callbacks uses some ideas from https://github.com/kriskowal/q

The idea is to be able to do something like this:

```javascript
aws('i-12345678').start();
```

But also to be able to chain the actions, and mix them with your own code.

```javascript
aws('i-12345678')
  .start()
  .then(function(s,f){
	console.log('started');
  	// do stuff
  	// ...
	s(); 
  })
  .stop()
  .then(function(s,f){
	console.log('stopped');
	// do more stuff
	//...
	s();
  })
  .then(function(s,f){
	console.log('all done');
	s();
  })
;
```


// (c) 2013-04-20, Ivan Kurmanov
