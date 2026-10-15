provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

resource "aws_iam_role" "ebs_csi_pod_identity" {
  name_prefix = "${var.cluster_name}-ebs-csi-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = [
        "sts:AssumeRole",
        "sts:TagSession",
      ]
    }]
  })

  tags = {
    Project   = "careflow"
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi_pod_identity" {
  role       = aws_iam_role.ebs_csi_pod_identity.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# Pass the role ARN to the add-on only after its managed policy is attached.
# This keeps the dependency local to EBS CSI instead of delaying the whole EKS
# module, whose internal count expressions must remain known during planning.
resource "terraform_data" "ebs_csi_pod_identity_ready" {
  input = aws_iam_role.ebs_csi_pod_identity.arn

  depends_on = [aws_iam_role_policy_attachment.ebs_csi_pod_identity]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "6.7.3"

  name           = "${var.cluster_name}-vpc"
  cidr           = "10.20.0.0/16"
  azs            = ["ap-southeast-2a", "ap-southeast-2b"]
  public_subnets = ["10.20.1.0/24", "10.20.2.0/24"]

  enable_nat_gateway      = false
  map_public_ip_on_launch = true
  enable_dns_hostnames    = true
  enable_dns_support      = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  tags = {
    Project   = "careflow"
    ManagedBy = "terraform"
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "21.25.0"

  name                                     = var.cluster_name
  kubernetes_version                       = var.kubernetes_version
  endpoint_public_access                   = true
  enable_cluster_creator_admin_permissions = true
  # The AWS Free Plan organization policy denies creation of IAM OIDC
  # providers. CareFlow does not require IRSA, and the Pod Identity add-on
  # below provides the OIDC-free path if workload IAM is needed later.
  enable_irsa = false

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets

  addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = { before_compute = true }
    eks-pod-identity-agent = { before_compute = true }
    aws-ebs-csi-driver = {
      pod_identity_association = [{
        role_arn        = terraform_data.ebs_csi_pod_identity_ready.output
        service_account = "ebs-csi-controller-sa"
      }]
    }
  }

  eks_managed_node_groups = {
    careflow = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["m7i-flex.large"]
      min_size       = 2
      desired_size   = 2
      max_size       = 2
    }
  }

  tags = {
    Project   = "careflow"
    ManagedBy = "terraform"
  }
}
