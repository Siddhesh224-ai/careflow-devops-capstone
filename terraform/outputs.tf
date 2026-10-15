output "cluster_name" { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }
output "vpc_id" { value = module.vpc.vpc_id }
output "public_subnet_ids" { value = module.vpc.public_subnets }
output "update_kubeconfig" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name} --profile ${var.aws_profile}"
}