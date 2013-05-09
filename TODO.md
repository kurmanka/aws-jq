TO DO
=====

- Associating elastic IP addresses to instances and releasing them

	aws('i-12563478')
		.associate( '200.100.150.50' )
		.then(function() { console.log( 'all done' ); });

- Creating new EBS volumes (from scratch and from snapshots)

	aws('ebs')
		.create({size:10,az:'us-east-1e'})
		.attach({instance:'',device:'/dev/sdf'})
		.then(function() { console.log( 'all done' ); });

- Snapshotting existing EBS volumes

	aws('vol-23674518').snapshot();
	// or .snap();

- Creating (launching) new EC2 instances

	aws('ec2')
		.launch({ami: ..., class:..., secgroup: [...], ...})
		.get('InstanceId', 'PublicIpAddress', 'PrivateIpAddress', 
		function (iid, ip, privateip, next) {
    		console.log( 'instance id:', iid );
    		console.log( 'public ip:',   ip );
    		console.log( 'private ip:',  privateip );
		);

- Selecting instances and volumes via indirect selector expressions (non-id selectors). E.g. 
  "ec2#t" — by the Name tag, "ec2:latest", "ebs:latest" — by the entity creation datetime, 
  "ebs:available", "ec2:stopped" — by entity state, "ec2@t1.micro" — by the instance class.

- Creating (launching) new RDS instances, and stopping them

- Snapshotting existing RDS instances

- Recovering RDS snapshots

- Manipulating EC2 security groups

- Modifying EC2 instances (instance type, tags, EBS-optimized setting, etc.)

- Modifying RDS instances

- Removing EBS volumes, EBS snapshots, RDS snapshots
