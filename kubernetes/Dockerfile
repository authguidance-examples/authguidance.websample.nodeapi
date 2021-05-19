#
# The docker image for the OAuth secured NodeJS API
# After building, files in the image can be viewed via the below commands
# - eval $(minikube docker-env --profile api)
# - docker run -it demoapi:v1 sh
#

# Use the Node docker image for the lightweight Alpine Linux OS
FROM node:15.11.0-alpine

# Install tools for troubleshooting purposes
RUN apk --no-cache add curl
RUN apk --no-cache add openssl

# Set the API folder
WORKDIR /usr/api

# Copy files into our docker image
COPY dist/                      /usr/api/dist/
COPY data/*                     /usr/api/data/
COPY kubernetes/api.config.json /usr/api/
COPY package*.json              /usr/api/
COPY tsconfig.json              /usr/api/

# Create a low privilege user
RUN addgroup -g 1001 apigroup
RUN adduser -u 1001 -G apigroup -h /home/apiuser -D apiuser

# Install production dependencies
RUN npm install --production

# Configure the Linux OS to trust the Cluster root certificate, to enable HTTPS calls inside the cluster
# An example is calling a Kubernetes deployed Authorization Server at https://login.mycompany.com
COPY certs/kubernetes/internal/svc.default.cluster.local.ca.pem /usr/local/share/ca-certificates/trusted.ca.pem
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/trusted.ca.pem

# Run the API as the low privilege user
USER apiuser
CMD ["npm", "run", "startRelease"]
