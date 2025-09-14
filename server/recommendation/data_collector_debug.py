from .data_collector import DataCollector

if __name__ == "__main__":
    print("Starting MongoDB collection structure diagnostics...\n")
    collector = DataCollector()
    collector.debug_mongodb_collections()
