#!/bin/bash

#
# A MacOS script to build the Node API and deploy it to a local PC minikube Kubernetes cluster
#

#
# Use the minikube docker daemon rather than that of Docker Desktop for Mac
#
echo "Preparing Kubernetes ..."
eval $(minikube docker-env)

#
# Clean up any resources for the previously deployed version of the API
#
kubectl delete deploy/nodeapi   2>/dev/null
kubectl delete svc/nodeapi-svc  2>/dev/null
docker image rm -f nodeapi      2>/dev/null

#
# Build the docker image, with the Node files, configuration file and SSL certificate
#
echo "Building Docker Image from Node files ..."
cd ..
docker build -f deployment/Dockerfile -t nodeapi .
if [ $? -ne 0 ]
then
  echo "*** Docker build error ***"
  exit 1
fi

#
# Deploy the local docker image to multiple Kubernetes pods
#
echo "Deploying Docker Image to Kubernetes ..."
cd deployment
kubectl create -f Kubernetes.yaml
if [ $? -ne 0 ]
then
  echo "*** Kubernetes deployment error ***"
  exit 1
fi

#
# Output the names of created PODs and indicate success
#
echo "Deployment completed successfully"
kubectl get pod -l app=nodeapi

#
# View logs from a POD like this if needed, in order to troubleshoot development errors
#
#kubectl logs --tail=100 pod/nodeapi-74f57df659-2tjz5

#
# Connect to a POD like this if needed, to verify that deployed files are correct
#
#kubectl exec --stdin --tty pod/nodeapi-74f57df659-2tjz5 -- /bin/sh
#ls -lr /usr/sampleapi

#
# Get the load balanced Kubernetes URL like this and try to call the service
#
# echo $(minikube service --url nodeapi-svc)/api/companies
