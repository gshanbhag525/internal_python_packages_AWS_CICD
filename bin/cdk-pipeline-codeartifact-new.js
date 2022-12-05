#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("aws-cdk-lib");
// import * as cdk from '@aws-cdk/core';
const cdk_pipeline_codeartifact_new_stack_1 = require("../lib/cdk-pipeline-codeartifact-new-stack");
const app = new cdk.App();
new cdk_pipeline_codeartifact_new_stack_1.CdkPipelineCodeartifactNewStack(app, 'CdkPipelineCodeartifactNewStack');