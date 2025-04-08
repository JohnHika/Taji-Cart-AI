import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaEdit, FaGift, FaPlus, FaSpinner, FaTimes, FaTrash, FaTrophy } from 'react-icons/fa';
import Axios from '../../utils/Axios';

const CommunityPerksAdmin = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    purchaseGoal: 100,
    discountPercentage: 10,
    validityPeriod: 7,
    displayOnHomepage: true,
    displayInCart: true,
    displayInProfile: true
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/campaigns',
        method: 'GET'
      });
      if (response.data.success) {
        const allCampaigns = response.data.data || [];
        setCampaigns(allCampaigns);
      } else {
        toast.error(response.data.message || 'Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      purchaseGoal: 100,
      discountPercentage: 10,
      validityPeriod: 7,
      displayOnHomepage: true,
      displayInCart: true,
      displayInProfile: true
    });
    setIsEditing(false);
    setCurrentCampaign(null);
    setIsCreating(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Transform form data to match the API expectations
      const apiData = {
        title: formData.title,
        description: formData.description,
        goalTarget: formData.purchaseGoal,
        discountPercentage: formData.discountPercentage,
        validityPeriod: formData.validityPeriod,
        displayOnHomepage: formData.displayOnHomepage,
        displayInCart: formData.displayInCart,
        displayInProfile: formData.displayInProfile
      };
      
      if (isEditing && currentCampaign) {
        // Update existing campaign
        const response = await Axios({
          url: `/api/campaigns/${currentCampaign._id}`,
          method: 'PUT',
          data: apiData
        });
        
        if (response.data.success) {
          toast.success('Community perk updated successfully!');
          resetForm();
          fetchCampaigns();
        } else {
          toast.error(response.data.message || 'Failed to update perk');
        }
      } else {
        // Create new campaign
        const response = await Axios({
          url: '/api/campaigns/perks',
          method: 'POST',
          data: apiData
        });
        
        if (response.data.success) {
          toast.success('Community perk created successfully!');
          resetForm();
          fetchCampaigns();
        } else {
          toast.error(response.data.message || 'Failed to create perk');
        }
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} perk:`, error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} perk: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (campaign) => {
    setIsEditing(true);
    setCurrentCampaign(campaign);
    setIsCreating(true);
    
    // Map campaign data to form fields
    setFormData({
      title: campaign.title || '',
      description: campaign.description || '',
      purchaseGoal: campaign.goalTarget || 100,
      discountPercentage: campaign.rewardValue || 10,
      validityPeriod: campaign.metadata?.validityPeriod || 7,
      displayOnHomepage: campaign.metadata?.displayOnHomepage || true,
      displayInCart: campaign.metadata?.displayInCart || true,
      displayInProfile: campaign.metadata?.displayInProfile || true
    });
  };

  const confirmDelete = (campaign) => {
    setCampaignToDelete(campaign);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    
    try {
      setLoading(true);
      const response = await Axios({
        url: `/api/campaigns/${campaignToDelete._id}`,
        method: 'DELETE'
      });
      
      if (response.data.success) {
        toast.success('Community perk deleted successfully!');
        fetchCampaigns();
      } else {
        toast.error(response.data.message || 'Failed to delete perk');
      }
    } catch (error) {
      console.error('Error deleting perk:', error);
      toast.error('Failed to delete perk');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setCampaignToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setCampaignToDelete(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Community Perks Management</h1>
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300 flex items-center"
          >
            <FaPlus className="mr-2" /> New Community Perk
          </button>
        ) : (
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center"
          >
            <FaTimes className="mr-2" /> Cancel
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            {isEditing ? 'Edit Community Perk' : 'Create New Community Perk'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="e.g., Weekend Shopping Spree Challenge"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Goal</label>
                <input
                  type="number"
                  name="purchaseGoal"
                  value={formData.purchaseGoal}
                  onChange={handleInputChange}
                  min="10"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Percentage</label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={formData.discountPercentage}
                  onChange={handleInputChange}
                  min="1"
                  max="50"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validity Period (days)</label>
                <input
                  type="number"
                  name="validityPeriod"
                  value={formData.validityPeriod}
                  onChange={handleInputChange}
                  min="1"
                  max="30"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                rows="3"
                placeholder="e.g., If 500 customers each make a purchase this week, all loyalty cardholders unlock a 15% discount next weekend."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="displayOnHomepage"
                  name="displayOnHomepage"
                  checked={formData.displayOnHomepage}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="displayOnHomepage" className="dark:text-gray-300">Display on Homepage</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="displayInCart"
                  name="displayInCart"
                  checked={formData.displayInCart}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="displayInCart" className="dark:text-gray-300">Display in Cart</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="displayInProfile"
                  name="displayInProfile"
                  checked={formData.displayInProfile}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="displayInProfile" className="dark:text-gray-300">Display in Profile</label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300 flex items-center"
                disabled={loading}
              >
                {loading ? <FaSpinner className="animate-spin" /> : isEditing ? 'Update Community Perk' : 'Create Community Perk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !isCreating ? (
        <div className="flex justify-center items-center h-40">
          <FaSpinner className="animate-spin text-primary-300 text-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <FaGift className="mx-auto text-gray-400 dark:text-gray-500 text-4xl mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No community campaigns or perks found</p>
            </div>
          ) : (
            campaigns.map(campaign => {
              const progress = Math.min(100, Math.floor(((campaign.currentProgress || 0) / (campaign.goalTarget || 100)) * 100));
              const isPerk = campaign.metadata?.isPerk === true;
              
              return (
                <div 
                  key={campaign._id}
                  className={`p-4 border rounded-lg shadow-sm ${
                    isPerk 
                    ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-800/30' 
                    : 'bg-white dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className={`p-2 rounded-full ${
                        isPerk 
                        ? 'bg-yellow-100 dark:bg-yellow-900/50' 
                        : 'bg-blue-100 dark:bg-blue-900/30'
                      } mr-3`}>
                        {isPerk 
                          ? <FaGift className="text-yellow-600 dark:text-yellow-400" /> 
                          : <FaTrophy className="text-blue-600 dark:text-blue-400" />
                        }
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium dark:text-white">{campaign.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{campaign.description}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {isPerk && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded-full">
                              Community Perk
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-full">
                            Goal: {campaign.goalTarget || 0} {campaign.goalType || 'purchases'}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-full">
                            Reward: {campaign.rewardValue || 0}% {campaign.rewardType || 'discount'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(campaign)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-200 dark:hover:text-primary-200"
                        title="Edit campaign"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => confirmDelete(campaign)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        title="Delete campaign"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="dark:text-gray-300">Progress: {campaign.currentProgress || 0} of {campaign.goalTarget || 0}</span>
                      <span className="dark:text-gray-300">{progress}% Complete</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className={`${isPerk ? 'bg-yellow-500' : 'bg-blue-500'} h-2.5 rounded-full`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Confirm Delete</h3>
            <p className="mb-6 dark:text-gray-300">
              Are you sure you want to delete the campaign "{campaignToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPerksAdmin;