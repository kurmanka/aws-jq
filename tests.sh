#!/bin/bash
for file in test/*
do
  echo \> $file
  node $file
done
