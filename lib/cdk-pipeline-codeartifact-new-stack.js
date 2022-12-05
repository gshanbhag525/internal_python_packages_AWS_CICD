"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkPipelineCodeartifactNewStack = void 0;
const cdk = require("aws-cdk-lib");
const codepipeline = require("aws-cdk-lib/aws-codepipeline");
const codepipeline_actions = require("aws-cdk-lib/aws-codepipeline-actions");
const codecommit = require("aws-cdk-lib/aws-codecommit");
const codebuild = require("aws-cdk-lib/aws-codebuild");
const iam = require("aws-cdk-lib/aws-iam");
const cfninc = require("aws-cdk-lib/cloudformation-include");

class CdkPipelineCodeartifactNewStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
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
                }
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
                            'export CODEARTIFACT_AUTH_TOKEN=`aws codeartifact get-authorization-token --domain cdkpipelines-codeartifact --domain-owner $Account_Id --query authorizationToken --output text`',
                        ],
                    },
                    build: {
                        commands: [
                            'cp setup.py /root/setup.py',
                            'python setup.py sdist bdist_wheel',
                        ],
                    },
                    post_build: {
                        commands: [
                            'bash -c "if [ /"$CODEBUILD_BUILD_SUCCEEDING/" == /"0/" ]; then exit 1; fi"',
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
        const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'Approve',
        });
        new codepipeline.Pipeline(this, 'codeartifact-pipeline', {
            stages: [
                {
                    stageName: 'Source_CodeCommit',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build_JAR_CodeArtifact',
                    actions: [buildAction],
                },
                {
                    stageName: 'Manual_Approval',
                    actions: [manualApprovalAction],
                },
            ]
        });
    }
}
exports.CdkPipelineCodeartifactNewStack = CdkPipelineCodeartifactNewStack;