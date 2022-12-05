import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cfninc from 'aws-cdk-lib/cloudformation-include';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class CdkPipelineCodeartifactNewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

// create ssm paramter to store library and layer version mapping

    const ssmParam = new ssm.StringParameter(this, 'Parameter', {
      allowedPattern: '.*',
      description: 'The layer version and artifact arn',
      parameterName: '/barcodeutilsparser/latest',
      stringValue: 'Foo',
      tier: ssm.ParameterTier.STANDARD,
    });


// Create CodeArtifact Domain/Repositories

    const cfnTemplate = new cfninc.CfnInclude(this, 'CodeArtifactCfn', {
      templateFile: 'lib/ca-template.yaml',
    });

// Create CodeCommit Repository

    const repo = new codecommit.Repository(this, "ca-pipeline-repository", {
      repositoryName: "ca-pipeline-repository",
      description: "ca-pipeline-repository"
    });

    const buildRole = new iam.Role(this, 'PipBuild_CA_Role', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    
    buildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['*'],
    }));


    // CODEBUILD - project

    const project = new codebuild.Project(this, 'PipBuild_CodeArtifact', {
      projectName: 'PipBuild_CodeArtifact',
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2,
        privileged: true
      },
      environmentVariables: {
        'Account_Id': {
          value: `${cdk.Aws.ACCOUNT_ID}`
        },
        'LatestParamName': {
                  value: `${ssmParam.parameterName}`
        },
        'ParamName': {
                  value: "/barcodeutilsparser/"
        },
      },      
      role: buildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              'pip install --upgrade pip',
              'pip install awscli',
              'pip install requests',
              'pip install boto3',
              'pip install jq',
              'pip install wheel setuptools twine',
              'export TWINE_USERNAME=aws',
              'export TWINE_PASSWORD=`aws codeartifact get-authorization-token --domain cdkpipelines-codeartifact --domain-owner $Account_Id --query authorizationToken --output text`',
              'export TWINE_REPOSITORY_URL=`aws codeartifact get-repository-endpoint --domain cdkpipelines-codeartifact --domain-owner $Account_Id  --repository cdkpipelines-codeartifact-repository --format pypi --query repositoryEndpoint --output text`',
            ],
          },
          build: {
            commands: [
              'cp setup.py /root/setup.py',
              'python setup.py sdist bdist_wheel',
              'twine check dist/*',
              'PackageZipName=$(echo "$(ls dist/)" | grep tar.gz)',
              'Path=dist/',
              'FullPath=$Path$PackageZipName',
              'twine upload --repository cdkpipelines-codeartifact-repository "$FullPath"',
              'mkdir -p ./python',
              'cp -R ./barcodeutilsparser ./python',
              'zip -r layer.zip python',
              'LayerVersionArnSingapore=$(aws lambda publish-layer-version --layer-name "barcodeutilsparserLayer" --zip-file "fileb://layer.zip"  --region ap-southeast-1 | jq -r ".LayerVersionArn")',
              'LayerVersionArnOhio=$(aws lambda publish-layer-version --layer-name "barcodeutilsparserLayer" --zip-file "fileb://layer.zip"  --region us-east-2 | jq -r ".LayerVersionArn")',
              'CodeArtifactVersion="${PackageZipName%.tar.gz}"',
              'echo "$CodeArtifactVersion"',
               'JSON_STRING=$(jq -n --arg KEY0 \"us-east-2\" --arg VAL0 $LayerVersionArnOhio --arg KEY1 \"ap-southeast-1\" --arg VAL1 $LayerVersionArnSingapore --arg KEY2 \"codeartifact-package\" --arg VAL2 $CodeArtifactVersion \'{\("layers"):\[{\($KEY0):$VAL0,\($KEY1):$VAL1}\],\($KEY2):$VAL2}\')',
                  'echo "$JSON_STRING"',
              'JQ_STRING=$(echo "$JSON_STRING" | jq tojson)',
              'echo "$JQ_STRING"',
              'aws ssm put-parameter --name "$LatestParamName"   --type "String" --value "$JQ_STRING" --overwrite',
               'aws ssm put-parameter --name "$ParamName$CodeArtifactVersion"  --type "String" --value "$JQ_STRING" --overwrite',
            ],
          },
          post_build: {
            commands: [
              'bash -c "if [ /"$CODEBUILD_BUILD_SUCCEEDING/" == /"0/" ]; then exit 1; fi"',
              'echo "$(ls)"',
              'echo Build completed on `date`',
            ]
          }
        },
        artifacts: {
          files: [
            '*',
          ],
        },
        cache: {
        },
      })
    });

// Create CodePipeline    

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'Source_CodeCommit',
      repository: repo,
      branch: 'main',
      output: sourceOutput
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: project,
      input: sourceOutput,
      outputs: [buildOutput], 
    });


    new codepipeline.Pipeline(this, 'codeartifact-pipeline', {
      stages: [
        {
          stageName: 'Source_CodeCommit',
          actions: [sourceAction],
        },
        {
          stageName: 'Build_PIP_CodeArtifact',
          actions: [buildAction],
        },
      ]
    });


  }
}
