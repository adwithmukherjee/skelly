#!/bin/bash
# Docker helper script for common operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Start all services
start_services() {
    print_info "Starting all services..."
    docker-compose up -d
    print_info "Waiting for services to be healthy..."
    sleep 5
    docker-compose ps
}

# Stop all services
stop_services() {
    print_info "Stopping all services..."
    docker-compose down
}

# Restart services
restart_services() {
    stop_services
    start_services
}

# View logs
view_logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# Reset data volumes
reset_data() {
    print_warning "This will delete all data in PostgreSQL and Redis!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removing data volumes..."
        docker-compose down -v
        print_info "Data volumes removed."
    else
        print_info "Operation cancelled."
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    # This will be implemented when we have the migration tool set up
    print_warning "Migration command not yet implemented. Will be added with Drizzle setup."
}

# Access PostgreSQL CLI
psql_cli() {
    docker-compose exec postgres psql -U postgres -d skelly_dev
}

# Access Redis CLI
redis_cli() {
    docker-compose exec redis redis-cli
}

# Show help
show_help() {
    echo "Docker Helper Script"
    echo ""
    echo "Usage: ./scripts/docker-helper.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        View logs (optional: service name)"
    echo "  reset       Reset all data volumes"
    echo "  migrate     Run database migrations"
    echo "  psql        Access PostgreSQL CLI"
    echo "  redis       Access Redis CLI"
    echo "  help        Show this help message"
}

# Main script logic
check_docker

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs "$2"
        ;;
    reset)
        reset_data
        ;;
    migrate)
        run_migrations
        ;;
    psql)
        psql_cli
        ;;
    redis)
        redis_cli
        ;;
    help)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac