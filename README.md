# AWS CDK CICD for internal python packages

an AWS CDK code pipeline for internal python packages CICD onto AWS codeartifact

## Deployment

To deploy this project

1. Install aws cdk.

```bash
npm install -g aws-cdk
```

2. check if cdk is installed

```bash
cdk --version
```

3. Synth cdk project to create cloudformation templates

```bash
cdk synth
```

Note:
This CDK project is AWS Account agnostic.
Use aws cli profile while deploying and diff

4. Create an AWS CLI profile:

```
aws configure --profile guneshs
```

or if you want to set this profile as default

```
aws configure
```

Pass aws Acc id, secret access key id, access key id, aws region, outfomat : json

4. Before deploying, Check what services/infra resources will be altered or created:

```bash
cdk diff --profile guneshs
```

5. Deploy the cdk

```bash
cdk deploy --profile guneshs
```

6. It will generate a codecommit repo named "ca-pipeline-repository". You can push your internal packages onto that repo and this stack will take care of you package building i.e .whl and pushing onto the aws codeartifact for other devs to pip install the package.
