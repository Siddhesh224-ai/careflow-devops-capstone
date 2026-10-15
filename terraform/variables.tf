variable "aws_profile" {
  type    = string
  default = "careflow-admin"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-2"
}

variable "cluster_name" {
  type    = string
  default = "careflow-eks"
}

variable "kubernetes_version" {
  type    = string
  default = "1.37"
}
