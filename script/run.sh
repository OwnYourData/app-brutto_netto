#!/bin/bash

rm -f /usr/src/app/tmp/pids/server.pid /usr/src/app/log/*.log
rails server -b 0.0.0.0