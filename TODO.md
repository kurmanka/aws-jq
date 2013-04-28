TO DO
=====

- Associating elastic IP addresses to instances and releasing them

- Creating new EBS volumes (from scratch and from snapshots)

- Snapshotting existing EBS volumes

- Creating (launching) new EC2 instances

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
