/**
 * POILayer - Points of Interest layer with clustering
 * Uses Supercluster for efficient client-side clustering
 */

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useMap } from '../core/MapContainer';
import { usePOIFetch, usePOICategories } from './usePOIFetch';
import { POI_CATEGORIES, MAP_CONFIG } from '../core/constants';
import Supercluster from 'supercluster';

// Create cluster for POI data
const createCluster = (options = {}) => {
  return new Supercluster({
    radius: options.radius || MAP_CONFIG.poi.clusterRadius,
    maxZoom: options.maxZoom || MAP_CONFIG.poi.clusterMaxZoom,
    minPoints: 2,
    ...options,
  });
};

/**
 * Hook to manage POI clustering
 */
export const usePOIClusters = (pois, map) => {
  const clusterRef = useRef(createCluster());
  const [clusters, setClusters] = useState([]);
  
  // Load POIs into cluster
  useEffect(() => {
    if (!pois?.features?.length) {
      setClusters([]);
      return;
    }
    
    clusterRef.current = createCluster();
    clusterRef.current.load(pois.features);
    
    // Initial cluster calculation
    if (map) {
      updateClusters();
    }
  }, [pois]);
  
  // Update clusters when map moves
  const updateClusters = useCallback(() => {
    if (!map || !pois?.features?.length) return;
    
    const bounds = map.getBounds();
    const zoom = Math.floor(map.getZoom());
    
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    
    const newClusters = clusterRef.current.getClusters(bbox, zoom);
    setClusters(newClusters);
  }, [map, pois]);
  
  // Expand cluster on click
  const expandCluster = useCallback((clusterId) => {
    if (!map) return;
    
    const zoom = clusterRef.current.getClusterExpansionZoom(clusterId);
    const leaves = clusterRef.current.getLeaves(clusterId, Infinity);
    
    if (leaves.length > 0) {
      const [lng, lat] = leaves[0].geometry.coordinates;
      map.easeTo({
        center: [lng, lat],
        zoom: Math.min(zoom, MAP_CONFIG.poi.clusterMaxZoom + 1),
        duration: 500,
      });
    }
  }, [map]);
  
  // Get leaves of a cluster
  const getClusterLeaves = useCallback((clusterId, limit = 10) => {
    return clusterRef.current.getLeaves(clusterId, limit);
  }, []);
  
  return {
    clusters,
    updateClusters,
    expandCluster,
    getClusterLeaves,
  };
};

/**
 * POI Layer component - renders POI markers and clusters
 */
export const POILayer = ({ 
  categories = ['restaurant', 'cafe'],
  onPOIClick,
  showCategories = true,
  clusterColors = {
    small: '#51bbd6',
    medium: '#f1f075',
    large: '#f28cb1',
  },
}) => {
  const { map } = useMap();
  const { pois, loading, error, fetchPOIs } = usePOIFetch();
  const { clusters, updateClusters, expandCluster } = usePOIClusters(pois, map);
  const sourceAddedRef = useRef(false);
  const markersRef = useRef([]);
  
  // Fetch POIs when map moves
  useEffect(() => {
    if (!map) return;
    
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      fetchPOIs({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      }, categories);
    };
    
    // Initial fetch
    handleMoveEnd();
    
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', updateClusters);
    
    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', updateClusters);
    };
  }, [map, categories, fetchPOIs, updateClusters]);
  
  // Update clusters when POIs change
  useEffect(() => {
    updateClusters();
  }, [pois, updateClusters]);
  
  // Add/update source and layers
  useEffect(() => {
    if (!map || !clusters.length) return;
    
    // Convert clusters to GeoJSON
    const clusterData = {
      type: 'FeatureCollection',
      features: clusters,
    };
    
    // Check if source exists
    if (map.getSource('poi-clusters')) {
      map.getSource('poi-clusters').setData(clusterData);
    } else {
      // Add source
      map.addSource('poi-clusters', {
        type: 'geojson',
        data: clusterData,
        cluster: false, // We handle clustering ourselves
      });
      
      // Add cluster circles layer
      map.addLayer({
        id: 'poi-cluster-circles',
        type: 'circle',
        source: 'poi-clusters',
        filter: ['has', 'cluster_id'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            clusterColors.small,
            10,
            clusterColors.medium,
            30,
            clusterColors.large,
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            25,
            30,
            35,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });
      
      // Add cluster count labels
      map.addLayer({
        id: 'poi-cluster-count',
        type: 'symbol',
        source: 'poi-clusters',
        filter: ['has', 'cluster_id'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });
      
      // Add individual POI markers
      map.addLayer({
        id: 'poi-points',
        type: 'circle',
        source: 'poi-clusters',
        filter: ['!', ['has', 'cluster_id']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'restaurant', POI_CATEGORIES.restaurant?.color || '#e74c3c',
            'hospital', POI_CATEGORIES.hospital?.color || '#e91e63',
            'school', POI_CATEGORIES.school?.color || '#9c27b0',
            'atm', POI_CATEGORIES.atm?.color || '#2196f3',
            'pharmacy', POI_CATEGORIES.pharmacy?.color || '#4caf50',
            'fuel', POI_CATEGORIES.fuel?.color || '#ff9800',
            'shopping', POI_CATEGORIES.shopping?.color || '#795548',
            'parking', POI_CATEGORIES.parking?.color || '#607d8b',
            '#888888', // default
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });
      
      // Add POI labels
      map.addLayer({
        id: 'poi-labels',
        type: 'symbol',
        source: 'poi-clusters',
        filter: ['!', ['has', 'cluster_id']],
        minzoom: 15,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-max-width': 10,
        },
        paint: {
          'text-color': '#333',
          'text-halo-color': '#fff',
          'text-halo-width': 1,
        },
      });
      
      sourceAddedRef.current = true;
    }
    
    // Cleanup
    return () => {
      if (sourceAddedRef.current && map.getSource('poi-clusters')) {
        ['poi-labels', 'poi-points', 'poi-cluster-count', 'poi-cluster-circles'].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        map.removeSource('poi-clusters');
        sourceAddedRef.current = false;
      }
    };
  }, [map, clusters, clusterColors]);
  
  // Handle click events
  useEffect(() => {
    if (!map) return;
    
    const handleClusterClick = (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['poi-cluster-circles'],
      });
      
      if (features.length) {
        const clusterId = features[0].properties.cluster_id;
        expandCluster(clusterId);
      }
    };
    
    const handlePOIClick = (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['poi-points'],
      });
      
      if (features.length && onPOIClick) {
        onPOIClick(features[0]);
      }
    };
    
    map.on('click', 'poi-cluster-circles', handleClusterClick);
    map.on('click', 'poi-points', handlePOIClick);
    
    // Cursor changes
    map.on('mouseenter', 'poi-cluster-circles', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'poi-cluster-circles', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'poi-points', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'poi-points', () => {
      map.getCanvas().style.cursor = '';
    });
    
    return () => {
      map.off('click', 'poi-cluster-circles', handleClusterClick);
      map.off('click', 'poi-points', handlePOIClick);
    };
  }, [map, expandCluster, onPOIClick]);
  
  return null; // This component doesn't render DOM directly
};

export default POILayer;
