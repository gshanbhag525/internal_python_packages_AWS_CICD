'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const assert_1 = require('@aws-cdk/assert');
const cdk = require('aws-cdk-lib');
const CdkPipelineCodeartifactNew = require('../lib/cdk-pipeline-codeartifact-new-stack');
test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkPipelineCodeartifactNew.CdkPipelineCodeartifactNewStack(
    app,
    'MyTestStack'
  );
  // THEN
  (0, assert_1.expect)(stack).to(
    (0, assert_1.matchTemplate)(
      {
        Resources: {},
      },
      assert_1.MatchStyle.EXACT
    )
  );
});
